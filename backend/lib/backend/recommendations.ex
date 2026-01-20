defmodule Backend.Recommendations do
  @moduledoc """
  The Recommendations context - handles trending content and user suggestions.

  Implements production-grade algorithms for:
  - Trending Projects: Twitter/X-style engagement weights + time decay + velocity boost
  - Who to Follow: Multi-signal scoring (social graph + popularity + relevance)
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.Project
  alias Backend.Accounts.User
  alias Backend.Social.{Follow, Like, Bookmark}
  alias Backend.Social.EngagementHourly

  # ============================================================================
  # Trending Projects Algorithm
  # ============================================================================

  @doc """
  Returns trending projects using sophisticated scoring.

  Formula: (weighted_engagement × velocity_boost × quality_multiplier) / (age_hours + 2)^1.8

  Engagement weights (Twitter/X-style):
  - Likes: 1.0
  - Comments: 13.5
  - Reposts: 20.0
  - Bookmarks: 10.0
  - Quotes: 15.0

  Quality multipliers:
  - +0.1 if has images
  - +0.1 if description > 100 chars
  - +0.1 if has tech stacks attached

  Options:
  - :limit - Number of projects to return (default 10)
  - :current_user_id - For engagement status (liked, bookmarked, etc.)
  """
  def trending_projects(opts \\ []) do
    limit = Keyword.get(opts, :limit, 10)
    current_user_id = Keyword.get(opts, :current_user_id)

    # 14-day candidate window (projects have longer shelf life than posts)
    cutoff = DateTime.add(DateTime.utc_now(), -14, :day)

    # Get projects with base scoring
    projects = build_trending_projects_query(cutoff, limit)
    |> Repo.all()
    |> add_velocity_boost()
    |> Enum.sort_by(& &1.final_score, :desc)
    |> Enum.take(limit)
    |> Enum.map(fn result ->
      project = Repo.preload(result.project, [:user, :ai_tools, :tech_stacks, :images])
      %{
        id: project.id,
        project: project,
        user: project.user,
        score: result.final_score
      }
    end)

    # Add engagement status if user is authenticated
    if current_user_id do
      add_engagement_status(projects, current_user_id)
    else
      projects
    end
  end

  defp build_trending_projects_query(cutoff, limit) do
    # Calculate base score with engagement weights, time decay, and quality multipliers
    # Note: We fetch more candidates for velocity boost calculation
    # The score fragment must be repeated in order_by since PostgreSQL doesn't allow
    # referencing computed column aliases in ORDER BY
    from(proj in Project,
      where: proj.status == "published" and proj.published_at > ^cutoff,
      select: %{
        project: proj,
        base_score: fragment("""
          (COALESCE(?, 0) * 1.0 +
           COALESCE(?, 0) * 13.5 +
           COALESCE(?, 0) * 20.0 +
           COALESCE(?, 0) * 10.0 +
           COALESCE(?, 0) * 15.0) *
          (1.0 +
           CASE WHEN EXISTS(SELECT 1 FROM project_images WHERE project_id = ?) THEN 0.1 ELSE 0 END +
           CASE WHEN LENGTH(COALESCE(?, '')) > 100 THEN 0.1 ELSE 0 END +
           CASE WHEN EXISTS(SELECT 1 FROM project_tech_stacks WHERE project_id = ?) THEN 0.1 ELSE 0 END
          ) /
          POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
        """,
          proj.likes_count,
          proj.comments_count,
          proj.reposts_count,
          proj.bookmarks_count,
          proj.quotes_count,
          proj.id,
          proj.description,
          proj.id,
          proj.published_at
        )
      },
      order_by: [desc: fragment("""
        (COALESCE(?, 0) * 1.0 +
         COALESCE(?, 0) * 13.5 +
         COALESCE(?, 0) * 20.0 +
         COALESCE(?, 0) * 10.0 +
         COALESCE(?, 0) * 15.0) *
        (1.0 +
         CASE WHEN EXISTS(SELECT 1 FROM project_images WHERE project_id = ?) THEN 0.1 ELSE 0 END +
         CASE WHEN LENGTH(COALESCE(?, '')) > 100 THEN 0.1 ELSE 0 END +
         CASE WHEN EXISTS(SELECT 1 FROM project_tech_stacks WHERE project_id = ?) THEN 0.1 ELSE 0 END
        ) /
        POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
      """,
        proj.likes_count,
        proj.comments_count,
        proj.reposts_count,
        proj.bookmarks_count,
        proj.quotes_count,
        proj.id,
        proj.description,
        proj.id,
        proj.published_at
      )],
      limit: ^(limit * 3)  # Fetch 3x for velocity boost filtering
    )
  end

  defp add_velocity_boost(projects) do
    # Get recent engagement velocity from engagement_hourly table
    project_ids = Enum.map(projects, & &1.project.id)

    recent_cutoff = DateTime.add(DateTime.utc_now(), -6, :hour)
    older_cutoff = DateTime.add(DateTime.utc_now(), -24, :hour)

    # Get recent engagement (last 6 hours)
    recent_engagement = from(e in EngagementHourly,
      where: e.content_type == "Project" and
             e.content_id in ^project_ids and
             e.hour_bucket >= ^recent_cutoff,
      group_by: e.content_id,
      select: {e.content_id, sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.bookmarks)}
    )
    |> Repo.all()
    |> Map.new()

    # Get older engagement (6-24 hours ago)
    older_engagement = from(e in EngagementHourly,
      where: e.content_type == "Project" and
             e.content_id in ^project_ids and
             e.hour_bucket >= ^older_cutoff and
             e.hour_bucket < ^recent_cutoff,
      group_by: e.content_id,
      select: {e.content_id, sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.bookmarks)}
    )
    |> Repo.all()
    |> Map.new()

    # Calculate velocity boost for each project
    Enum.map(projects, fn %{project: project, base_score: base_score} = result ->
      recent = Map.get(recent_engagement, project.id, 0) || 0
      older = Map.get(older_engagement, project.id, 0) || 0

      # Convert Decimals to floats for arithmetic
      recent_float = to_float(recent)
      older_float = to_float(older)
      base_score_float = to_float(base_score)

      # velocity = recent_engagement / (older_engagement + 1)
      # velocity_boost = min(1.0 + velocity, 3.0)
      velocity = recent_float / (older_float + 1)
      velocity_boost = min(1.0 + velocity, 3.0)

      final_score = base_score_float * velocity_boost

      Map.put(result, :final_score, final_score)
    end)
  end

  # Convert Decimal or other numeric types to float
  defp to_float(%Decimal{} = d), do: Decimal.to_float(d)
  defp to_float(nil), do: 0.0
  defp to_float(n) when is_float(n), do: n
  defp to_float(n) when is_integer(n), do: n * 1.0

  # ============================================================================
  # Who to Follow Algorithm
  # ============================================================================

  @doc """
  Returns suggested users to follow using multi-signal scoring.

  Formula: (graph_score × 0.4) + (popularity_score × 0.3) + (relevance_score × 0.3)

  Signals:
  - Social Graph (40%): Friends of friends, mutual connections, engaged creators
  - Popularity (30%): log(followers) × activity_multiplier × engagement_rate
  - Relevance (30%): Shared tools/stacks from liked/bookmarked projects

  Fallback for new users: Popular active creators

  Options:
  - :limit - Number of users to return (default 10)
  - :context - "sidebar" or "onboarding" for different diversity
  """
  def suggested_users(current_user_id, opts \\ []) when is_binary(current_user_id) do
    limit = Keyword.get(opts, :limit, 10)

    if has_social_graph?(current_user_id) do
      multi_signal_suggestions(current_user_id, limit)
    else
      popular_creators_fallback(current_user_id, limit)
    end
  end

  defp has_social_graph?(user_id) do
    # Check if user has any follows or engagement
    follows_count = from(f in Follow, where: f.follower_id == ^user_id, select: count(f.id))
    |> Repo.one()

    likes_count = from(l in Like, where: l.user_id == ^user_id, select: count(l.id))
    |> Repo.one()

    follows_count > 0 or likes_count > 3
  end

  defp multi_signal_suggestions(user_id, limit) do
    # Get candidates from each signal
    graph_candidates = get_graph_score_candidates(user_id, limit * 3)
    popularity_candidates = get_popularity_score_candidates(user_id, limit * 3)
    relevance_candidates = get_relevance_score_candidates(user_id, limit * 3)

    # Combine and score
    (graph_candidates ++ popularity_candidates ++ relevance_candidates)
    |> Enum.group_by(& &1.user_id)
    |> Enum.map(fn {candidate_user_id, scores} ->
      graph_score = Enum.find(scores, fn s -> s.signal == :graph end)
      |> then(fn s -> if s, do: s.score, else: 0.0 end)

      popularity_score = Enum.find(scores, fn s -> s.signal == :popularity end)
      |> then(fn s -> if s, do: s.score, else: 0.0 end)

      relevance_score = Enum.find(scores, fn s -> s.signal == :relevance end)
      |> then(fn s -> if s, do: s.score, else: 0.0 end)

      final_score = (graph_score * 0.4) + (popularity_score * 0.3) + (relevance_score * 0.3)

      %{user_id: candidate_user_id, final_score: final_score}
    end)
    |> Enum.sort_by(& &1.final_score, :desc)
    |> Enum.take(limit)
    |> load_users()
  end

  # Signal 1: Social Graph Score
  defp get_graph_score_candidates(user_id, limit) do
    # Friends of friends
    friends_of_friends = from(u in User,
      join: f1 in Follow, on: f1.following_id == u.id,
      join: f2 in Follow, on: f2.follower_id == f1.following_id,
      where: f2.following_id == ^user_id and
             u.id != ^user_id and
             u.id not in subquery(
               from f in Follow,
                 where: f.follower_id == ^user_id,
                 select: f.following_id
             ),
      group_by: u.id,
      select: %{
        user_id: u.id,
        score: count(f1.follower_id, :distinct) |> type(:float),
        signal: :graph
      },
      limit: ^limit
    )
    |> Repo.all()

    # Engaged creators (users whose content the viewer has liked/bookmarked)
    engaged_creators = from(u in User,
      left_join: l in Like, on: l.likeable_type in ["Post", "Project"],
      left_join: b in Bookmark, on: b.bookmarkable_type in ["Post", "Project"],
      left_join: p in Backend.Content.Post, on: p.id == l.likeable_id or p.id == b.bookmarkable_id,
      left_join: proj in Project, on: proj.id == l.likeable_id or proj.id == b.bookmarkable_id,
      where: (l.user_id == ^user_id or b.user_id == ^user_id) and
             (p.user_id == u.id or proj.user_id == u.id) and
             u.id != ^user_id and
             u.id not in subquery(
               from f in Follow,
                 where: f.follower_id == ^user_id,
                 select: f.following_id
             ),
      group_by: u.id,
      select: %{
        user_id: u.id,
        score: (count(l.id, :distinct) * 1.0 + count(b.id, :distinct) * 2.0) |> type(:float),
        signal: :graph
      },
      limit: ^limit
    )
    |> Repo.all()

    friends_of_friends ++ engaged_creators
  end

  # Signal 2: Popularity Score
  defp get_popularity_score_candidates(user_id, limit) do
    # Get users with follower counts and recent activity
    recent_cutoff = DateTime.add(DateTime.utc_now(), -7, :day)
    moderate_cutoff = DateTime.add(DateTime.utc_now(), -30, :day)
    old_cutoff = DateTime.add(DateTime.utc_now(), -60, :day)

    # Subquery for excluded users
    excluded_users = from(f in Follow,
      where: f.follower_id == ^user_id,
      select: f.following_id
    )

    from(u in User,
      left_join: f in Follow, on: f.following_id == u.id,
      left_join: recent_post in Backend.Content.Post,
        on: recent_post.user_id == u.id and recent_post.inserted_at > ^recent_cutoff,
      left_join: moderate_post in Backend.Content.Post,
        on: moderate_post.user_id == u.id and moderate_post.inserted_at > ^moderate_cutoff and moderate_post.inserted_at <= ^recent_cutoff,
      left_join: old_post in Backend.Content.Post,
        on: old_post.user_id == u.id and old_post.inserted_at > ^old_cutoff and old_post.inserted_at <= ^moderate_cutoff,
      where: u.id != ^user_id and u.id not in subquery(excluded_users),
      group_by: u.id,
      select: %{
        user_id: u.id,
        score: fragment("""
          LN(COALESCE(COUNT(DISTINCT ?), 0) + 1) *
          CASE
            WHEN COUNT(DISTINCT ?) > 0 THEN 1.0
            WHEN COUNT(DISTINCT ?) > 0 THEN 0.8
            WHEN COUNT(DISTINCT ?) > 0 THEN 0.5
            ELSE 0.0
          END
        """, f.id, recent_post.id, moderate_post.id, old_post.id) |> type(:float),
        signal: :popularity
      },
      having: fragment("COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0",
        recent_post.id, moderate_post.id, old_post.id),
      limit: ^limit
    )
    |> Repo.all()
  end

  # Signal 3: Relevance Score
  defp get_relevance_score_candidates(user_id, limit) do
    # Get shared AI tools and tech stacks from user's liked/bookmarked projects
    from(u in User,
      join: proj in Project, on: proj.user_id == u.id,
      left_join: pat in "project_ai_tools", on: pat.project_id == proj.id,
      left_join: pts in "project_tech_stacks", on: pts.project_id == proj.id,
      where: u.id != ^user_id and
             u.id not in subquery(
               from f in Follow,
                 where: f.follower_id == ^user_id,
                 select: f.following_id
             ) and
             (pat.ai_tool_id in subquery(
               from l in Like,
                 join: p2 in Project, on: p2.id == l.likeable_id and l.likeable_type == "Project",
                 join: pat2 in "project_ai_tools", on: pat2.project_id == p2.id,
                 where: l.user_id == ^user_id,
                 select: pat2.ai_tool_id
             ) or pts.tech_stack_id in subquery(
               from l in Like,
                 join: p2 in Project, on: p2.id == l.likeable_id and l.likeable_type == "Project",
                 join: pts2 in "project_tech_stacks", on: pts2.project_id == p2.id,
                 where: l.user_id == ^user_id,
                 select: pts2.tech_stack_id
             )),
      group_by: u.id,
      select: %{
        user_id: u.id,
        score: (count(pat.ai_tool_id, :distinct) + count(pts.tech_stack_id, :distinct)) |> type(:float),
        signal: :relevance
      },
      limit: ^limit
    )
    |> Repo.all()
  end

  # Fallback for new users with no social graph
  defp popular_creators_fallback(user_id, limit) do
    recent_cutoff = DateTime.add(DateTime.utc_now(), -7, :day)

    from(u in User,
      left_join: f in Follow, on: f.following_id == u.id,
      left_join: p in Backend.Content.Post, on: p.user_id == u.id and p.inserted_at > ^recent_cutoff,
      left_join: proj in Project, on: proj.user_id == u.id and proj.published_at > ^recent_cutoff,
      where: u.id != ^user_id and
             u.id not in subquery(
               from f in Follow,
                 where: f.follower_id == ^user_id,
                 select: f.following_id
             ),
      group_by: u.id,
      having: count(f.id, :distinct) > 0 and
              (count(p.id, :distinct) > 0 or count(proj.id, :distinct) > 0),
      order_by: [desc: count(f.id, :distinct)],
      limit: ^limit,
      select: u
    )
    |> Repo.all()
  end

  defp load_users(scored_users) do
    user_ids = Enum.map(scored_users, & &1.user_id)

    users = from(u in User, where: u.id in ^user_ids)
    |> Repo.all()
    |> Map.new(fn u -> {u.id, u} end)

    Enum.map(scored_users, fn %{user_id: id, final_score: _score} ->
      Map.get(users, id)
    end)
    |> Enum.filter(& &1 != nil)
  end

  # ============================================================================
  # Private Helper Functions
  # ============================================================================

  defp add_engagement_status(projects, user_id) do
    Enum.map(projects, fn item ->
      liked = Backend.Social.has_liked?(user_id, "Project", item.project.id)
      bookmarked = Backend.Social.has_bookmarked?(user_id, "Project", item.project.id)
      reposted = Backend.Social.has_reposted?(user_id, "Project", item.project.id)

      item
      |> Map.put(:liked, liked)
      |> Map.put(:bookmarked, bookmarked)
      |> Map.put(:reposted, reposted)
    end)
  end
end
