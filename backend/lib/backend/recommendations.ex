defmodule Backend.Recommendations do
  @moduledoc """
  The Recommendations context - handles trending content and user suggestions.

  Implements production-grade algorithms for:
  - Trending Projects: Twitter/X-style engagement weights + time decay + velocity boost
  - Who to Follow: Multi-signal scoring with normalized weights

  ## Who to Follow Algorithm

  Formula: (graph × 0.35) + (popularity × 0.25) + (relevance × 0.25) + (diversity × 0.15)

  All signals are normalized to 0-1 scale before combining to ensure fair weighting.

  ### Signals:
  1. **Social Graph (35%)**: Friends of friends + engaged creators (liked/bookmarked content)
  2. **Popularity (25%)**: log(followers) × activity_multiplier (considers posts AND projects)
  3. **Relevance (25%)**: Shared AI tools/tech stacks from liked AND bookmarked projects
  4. **Diversity (15%)**: Quality creators using DIFFERENT tools/stacks (anti-filter-bubble)

  ### Exclusions:
  - Users already followed
  - Blocked users (bidirectional)
  - Recently dismissed suggestions (30-day cooldown)

  ### Cold Start:
  For new users (<1 follow AND <3 likes), returns popular active creators.
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
    projects =
      build_trending_projects_query(cutoff, limit)
      |> Repo.all()
      |> add_velocity_boost()
      |> Enum.sort_by(& &1.final_score, :desc)
      |> Enum.take(limit)
      |> Enum.map(fn result ->
        project = Repo.preload(result.project, [:user, :ai_tools, :tech_stacks, :images])

        %{
          project: project,
          likes_count: project.likes_count || 0,
          comments_count: project.comments_count || 0,
          reposts_count: project.reposts_count || 0,
          bookmarks_count: project.bookmarks_count || 0
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
        base_score:
          fragment(
            """
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
      order_by: [
        desc:
          fragment(
            """
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
      ],
      # Fetch 3x for velocity boost filtering
      limit: ^(limit * 3)
    )
  end

  defp add_velocity_boost(projects) do
    # Get recent engagement velocity from engagement_hourly table
    project_ids = Enum.map(projects, & &1.project.id)

    recent_cutoff = DateTime.add(DateTime.utc_now(), -6, :hour)
    older_cutoff = DateTime.add(DateTime.utc_now(), -24, :hour)

    # Get recent engagement (last 6 hours)
    recent_engagement =
      from(e in EngagementHourly,
        where:
          e.content_type == "Project" and
            e.content_id in ^project_ids and
            e.hour_bucket >= ^recent_cutoff,
        group_by: e.content_id,
        select: {e.content_id, sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.bookmarks)}
      )
      |> Repo.all()
      |> Map.new()

    # Get older engagement (6-24 hours ago)
    older_engagement =
      from(e in EngagementHourly,
        where:
          e.content_type == "Project" and
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
  Returns suggested users to follow using multi-signal scoring with normalization.

  Formula: (graph × 0.35) + (popularity × 0.25) + (relevance × 0.25) + (diversity × 0.15)

  Signals (all normalized to 0-1 before combining):
  - Social Graph (35%): Friends of friends + creators of liked/bookmarked content
  - Popularity (25%): log(followers) × activity_multiplier (posts AND projects)
  - Relevance (25%): Shared AI tools/tech stacks from liked AND bookmarked projects
  - Diversity (15%): Quality creators using different tech (anti-filter-bubble)

  Exclusions:
  - Users already followed
  - Blocked users (bidirectional)
  - Recently dismissed suggestions (30-day cooldown)

  Fallback for new users: Popular active creators

  Options:
  - :limit - Number of users to return (default 10)
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
    # Single query to check if user has any follows or engagement
    result =
      from(u in User,
        where: u.id == ^user_id,
        left_join: f in Follow,
        on: f.follower_id == u.id,
        left_join: l in Like,
        on: l.user_id == u.id,
        select: %{
          follows_count: count(f.id, :distinct),
          likes_count: count(l.id, :distinct)
        }
      )
      |> Repo.one()

    result && (result.follows_count > 0 or result.likes_count > 3)
  end

  defp multi_signal_suggestions(user_id, limit) do
    # Get excluded users (blocked, muted, dismissed)
    excluded_ids = get_excluded_user_ids(user_id)

    # Get candidates from each signal
    graph_candidates = get_graph_score_candidates(user_id, excluded_ids, limit * 3)
    popularity_candidates = get_popularity_score_candidates(user_id, excluded_ids, limit * 3)
    relevance_candidates = get_relevance_score_candidates(user_id, excluded_ids, limit * 3)
    diversity_candidates = get_diversity_candidates(user_id, excluded_ids, limit)

    # Combine all candidates
    all_candidates = graph_candidates ++ popularity_candidates ++ relevance_candidates ++ diversity_candidates

    # Calculate max scores for normalization (avoid division by zero)
    max_graph = all_candidates |> Enum.filter(&(&1.signal == :graph)) |> Enum.map(& &1.score) |> Enum.max(fn -> 1.0 end)
    max_popularity = all_candidates |> Enum.filter(&(&1.signal == :popularity)) |> Enum.map(& &1.score) |> Enum.max(fn -> 1.0 end)
    max_relevance = all_candidates |> Enum.filter(&(&1.signal == :relevance)) |> Enum.map(& &1.score) |> Enum.max(fn -> 1.0 end)
    max_diversity = all_candidates |> Enum.filter(&(&1.signal == :diversity)) |> Enum.map(& &1.score) |> Enum.max(fn -> 1.0 end)

    # Group by user and normalize scores
    all_candidates
    |> Enum.group_by(& &1.user_id)
    |> Enum.map(fn {candidate_user_id, scores} ->
      # Extract and normalize each signal to 0-1 scale
      graph_score =
        Enum.find(scores, fn s -> s.signal == :graph end)
        |> then(fn s -> if s, do: normalize_score(s.score, max_graph), else: 0.0 end)

      popularity_score =
        Enum.find(scores, fn s -> s.signal == :popularity end)
        |> then(fn s -> if s, do: normalize_score(s.score, max_popularity), else: 0.0 end)

      relevance_score =
        Enum.find(scores, fn s -> s.signal == :relevance end)
        |> then(fn s -> if s, do: normalize_score(s.score, max_relevance), else: 0.0 end)

      diversity_score =
        Enum.find(scores, fn s -> s.signal == :diversity end)
        |> then(fn s -> if s, do: normalize_score(s.score, max_diversity), else: 0.0 end)

      # Weighted combination: graph 35%, popularity 25%, relevance 25%, diversity 15%
      final_score = graph_score * 0.35 + popularity_score * 0.25 + relevance_score * 0.25 + diversity_score * 0.15

      %{user_id: candidate_user_id, final_score: final_score}
    end)
    |> Enum.sort_by(& &1.final_score, :desc)
    |> Enum.take(limit)
    |> load_users()
  end

  # Normalize score to 0-1 range
  defp normalize_score(score, max) when max > 0, do: min(to_float(score) / to_float(max), 1.0)
  defp normalize_score(_score, _max), do: 0.0

  # Get users that should be excluded from suggestions
  defp get_excluded_user_ids(user_id) do
    # Users already being followed
    following_ids =
      from(f in Follow, where: f.follower_id == ^user_id, select: f.following_id)
      |> Repo.all()

    # Blocked users (if block relationship exists)
    blocked_ids = get_blocked_user_ids(user_id)

    # Dismissed suggestions (if tracking exists)
    dismissed_ids = get_dismissed_suggestion_ids(user_id)

    MapSet.new([user_id] ++ following_ids ++ blocked_ids ++ dismissed_ids)
  end

  defp get_blocked_user_ids(user_id) do
    # Check if blocks table exists and get blocked users
    if Repo.exists?(from("user_blocks", select: 1, limit: 1)) do
      from(b in "user_blocks",
        where: b.blocker_id == ^user_id or b.blocked_id == ^user_id,
        select: fragment("CASE WHEN ? = ? THEN ? ELSE ? END", b.blocker_id, ^user_id, b.blocked_id, b.blocker_id)
      )
      |> Repo.all()
    else
      []
    end
  rescue
    _ -> []
  end

  defp get_dismissed_suggestion_ids(user_id) do
    # Check if dismissed_suggestions table exists
    if Repo.exists?(from("dismissed_suggestions", select: 1, limit: 1)) do
      # Only exclude recently dismissed (last 30 days)
      cutoff = DateTime.add(DateTime.utc_now(), -30, :day)
      from(d in "dismissed_suggestions",
        where: d.user_id == ^user_id and d.dismissed_at > ^cutoff,
        select: d.dismissed_user_id
      )
      |> Repo.all()
    else
      []
    end
  rescue
    _ -> []
  end

  # Signal 1: Social Graph Score
  defp get_graph_score_candidates(user_id, excluded_ids, limit) do
    excluded_list = MapSet.to_list(excluded_ids)

    # Friends of friends - users followed by people you follow
    friends_of_friends =
      from(u in User,
        join: f1 in Follow,
        on: f1.following_id == u.id,
        join: f2 in Follow,
        on: f2.follower_id == f1.following_id,
        where:
          f2.following_id == ^user_id and
            u.id not in ^excluded_list,
        group_by: u.id,
        select: %{
          user_id: u.id,
          score: count(f1.follower_id, :distinct) |> type(:float),
          signal: :graph
        },
        order_by: [desc: count(f1.follower_id, :distinct)],
        limit: ^limit
      )
      |> Repo.all()

    # Engaged creators from liked posts - properly structured query
    liked_post_creators =
      from(u in User,
        join: p in Backend.Content.Post,
        on: p.user_id == u.id,
        join: l in Like,
        on: l.likeable_id == p.id and l.likeable_type == "Post" and l.user_id == ^user_id,
        where: u.id not in ^excluded_list,
        group_by: u.id,
        select: %{
          user_id: u.id,
          score: count(l.id, :distinct) |> type(:float),
          signal: :graph
        },
        limit: ^limit
      )
      |> Repo.all()

    # Engaged creators from liked projects
    liked_project_creators =
      from(u in User,
        join: proj in Project,
        on: proj.user_id == u.id,
        join: l in Like,
        on: l.likeable_id == proj.id and l.likeable_type == "Project" and l.user_id == ^user_id,
        where: u.id not in ^excluded_list,
        group_by: u.id,
        select: %{
          user_id: u.id,
          score: count(l.id, :distinct) |> type(:float),
          signal: :graph
        },
        limit: ^limit
      )
      |> Repo.all()

    # Engaged creators from bookmarked posts (weighted 2x)
    bookmarked_post_creators =
      from(u in User,
        join: p in Backend.Content.Post,
        on: p.user_id == u.id,
        join: b in Bookmark,
        on: b.bookmarkable_id == p.id and b.bookmarkable_type == "Post" and b.user_id == ^user_id,
        where: u.id not in ^excluded_list,
        group_by: u.id,
        select: %{
          user_id: u.id,
          score: (count(b.id, :distinct) * 2.0) |> type(:float),
          signal: :graph
        },
        limit: ^limit
      )
      |> Repo.all()

    # Engaged creators from bookmarked projects (weighted 2x)
    bookmarked_project_creators =
      from(u in User,
        join: proj in Project,
        on: proj.user_id == u.id,
        join: b in Bookmark,
        on: b.bookmarkable_id == proj.id and b.bookmarkable_type == "Project" and b.user_id == ^user_id,
        where: u.id not in ^excluded_list,
        group_by: u.id,
        select: %{
          user_id: u.id,
          score: (count(b.id, :distinct) * 2.0) |> type(:float),
          signal: :graph
        },
        limit: ^limit
      )
      |> Repo.all()

    # Combine all graph signals - scores will be summed per user in grouping
    friends_of_friends ++ liked_post_creators ++ liked_project_creators ++ bookmarked_post_creators ++ bookmarked_project_creators
  end

  # Signal 2: Popularity Score
  defp get_popularity_score_candidates(_user_id, excluded_ids, limit) do
    excluded_list = MapSet.to_list(excluded_ids)

    # Get users with follower counts and recent activity (posts OR projects)
    recent_cutoff = DateTime.add(DateTime.utc_now(), -7, :day)
    moderate_cutoff = DateTime.add(DateTime.utc_now(), -30, :day)
    old_cutoff = DateTime.add(DateTime.utc_now(), -60, :day)

    from(u in User,
      left_join: f in Follow,
      on: f.following_id == u.id,
      # Posts activity
      left_join: recent_post in Backend.Content.Post,
      on: recent_post.user_id == u.id and recent_post.inserted_at > ^recent_cutoff,
      left_join: moderate_post in Backend.Content.Post,
      on:
        moderate_post.user_id == u.id and moderate_post.inserted_at > ^moderate_cutoff and
          moderate_post.inserted_at <= ^recent_cutoff,
      left_join: old_post in Backend.Content.Post,
      on:
        old_post.user_id == u.id and old_post.inserted_at > ^old_cutoff and
          old_post.inserted_at <= ^moderate_cutoff,
      # Projects activity
      left_join: recent_proj in Project,
      on: recent_proj.user_id == u.id and recent_proj.status == "published" and recent_proj.published_at > ^recent_cutoff,
      left_join: moderate_proj in Project,
      on:
        moderate_proj.user_id == u.id and moderate_proj.status == "published" and
          moderate_proj.published_at > ^moderate_cutoff and moderate_proj.published_at <= ^recent_cutoff,
      left_join: old_proj in Project,
      on:
        old_proj.user_id == u.id and old_proj.status == "published" and
          old_proj.published_at > ^old_cutoff and old_proj.published_at <= ^moderate_cutoff,
      where: u.id not in ^excluded_list,
      group_by: u.id,
      select: %{
        user_id: u.id,
        score:
          fragment(
            """
              LN(COALESCE(COUNT(DISTINCT ?), 0) + 1) *
              CASE
                WHEN COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 THEN 1.0
                WHEN COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 THEN 0.8
                WHEN COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 THEN 0.5
                ELSE 0.0
              END
            """,
            f.id,
            recent_post.id,
            recent_proj.id,
            moderate_post.id,
            moderate_proj.id,
            old_post.id,
            old_proj.id
          )
          |> type(:float),
        signal: :popularity
      },
      having:
        fragment(
          """
          COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 OR
          COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0 OR COUNT(DISTINCT ?) > 0
          """,
          recent_post.id,
          moderate_post.id,
          old_post.id,
          recent_proj.id,
          moderate_proj.id,
          old_proj.id
        ),
      order_by: [desc: fragment("LN(COALESCE(COUNT(DISTINCT ?), 0) + 1)", f.id)],
      limit: ^limit
    )
    |> Repo.all()
  end

  # Signal 3: Relevance Score
  defp get_relevance_score_candidates(user_id, excluded_ids, limit) do
    excluded_list = MapSet.to_list(excluded_ids)

    # Get AI tools from user's liked AND bookmarked projects
    user_liked_ai_tools =
      from(l in Like,
        join: p in Project,
        on: p.id == l.likeable_id and l.likeable_type == "Project",
        join: pat in "project_ai_tools",
        on: pat.project_id == p.id,
        where: l.user_id == ^user_id,
        select: pat.ai_tool_id
      )

    user_bookmarked_ai_tools =
      from(b in Bookmark,
        join: p in Project,
        on: p.id == b.bookmarkable_id and b.bookmarkable_type == "Project",
        join: pat in "project_ai_tools",
        on: pat.project_id == p.id,
        where: b.user_id == ^user_id,
        select: pat.ai_tool_id
      )

    # Get tech stacks from user's liked AND bookmarked projects
    user_liked_tech_stacks =
      from(l in Like,
        join: p in Project,
        on: p.id == l.likeable_id and l.likeable_type == "Project",
        join: pts in "project_tech_stacks",
        on: pts.project_id == p.id,
        where: l.user_id == ^user_id,
        select: pts.tech_stack_id
      )

    user_bookmarked_tech_stacks =
      from(b in Bookmark,
        join: p in Project,
        on: p.id == b.bookmarkable_id and b.bookmarkable_type == "Project",
        join: pts in "project_tech_stacks",
        on: pts.project_id == p.id,
        where: b.user_id == ^user_id,
        select: pts.tech_stack_id
      )

    # Find creators using matching tools/stacks
    from(u in User,
      join: proj in Project,
      on: proj.user_id == u.id and proj.status == "published",
      left_join: pat in "project_ai_tools",
      on: pat.project_id == proj.id,
      left_join: pts in "project_tech_stacks",
      on: pts.project_id == proj.id,
      where:
        u.id not in ^excluded_list and
          (pat.ai_tool_id in subquery(user_liked_ai_tools) or
             pat.ai_tool_id in subquery(user_bookmarked_ai_tools) or
             pts.tech_stack_id in subquery(user_liked_tech_stacks) or
             pts.tech_stack_id in subquery(user_bookmarked_tech_stacks)),
      group_by: u.id,
      select: %{
        user_id: u.id,
        score:
          (count(pat.ai_tool_id, :distinct) + count(pts.tech_stack_id, :distinct)) |> type(:float),
        signal: :relevance
      },
      order_by: [desc: count(pat.ai_tool_id, :distinct) + count(pts.tech_stack_id, :distinct)],
      limit: ^limit
    )
    |> Repo.all()
  end

  # Signal 4: Diversity Score - surfaces users outside the filter bubble
  defp get_diversity_candidates(user_id, excluded_ids, limit) do
    excluded_list = MapSet.to_list(excluded_ids)

    # Get tools/stacks the user typically engages with (to find DIFFERENT ones)
    user_tools =
      from(l in Like,
        join: p in Project,
        on: p.id == l.likeable_id and l.likeable_type == "Project",
        join: pat in "project_ai_tools",
        on: pat.project_id == p.id,
        where: l.user_id == ^user_id,
        select: pat.ai_tool_id
      )
      |> Repo.all()
      |> MapSet.new()

    user_stacks =
      from(l in Like,
        join: p in Project,
        on: p.id == l.likeable_id and l.likeable_type == "Project",
        join: pts in "project_tech_stacks",
        on: pts.project_id == p.id,
        where: l.user_id == ^user_id,
        select: pts.tech_stack_id
      )
      |> Repo.all()
      |> MapSet.new()

    # If user has no preferences yet, return empty (let other signals dominate)
    if MapSet.size(user_tools) == 0 and MapSet.size(user_stacks) == 0 do
      []
    else
      user_tools_list = MapSet.to_list(user_tools)
      user_stacks_list = MapSet.to_list(user_stacks)

      # Find high-quality creators using DIFFERENT tools/stacks
      # Score based on: follower count + engagement, but must use different tech
      recent_cutoff = DateTime.add(DateTime.utc_now(), -30, :day)

      from(u in User,
        join: proj in Project,
        on: proj.user_id == u.id and proj.status == "published",
        left_join: f in Follow,
        on: f.following_id == u.id,
        left_join: pat in "project_ai_tools",
        on: pat.project_id == proj.id,
        left_join: pts in "project_tech_stacks",
        on: pts.project_id == proj.id,
        where:
          u.id not in ^excluded_list and
            proj.published_at > ^recent_cutoff and
            # Must have SOME tools/stacks
            (not is_nil(pat.ai_tool_id) or not is_nil(pts.tech_stack_id)),
        group_by: u.id,
        # Score: popularity but filter for diversity
        select: %{
          user_id: u.id,
          score:
            fragment(
              "LN(COALESCE(COUNT(DISTINCT ?), 0) + 1) * (1.0 + COALESCE(AVG(?), 0) / 100.0)",
              f.id,
              proj.likes_count
            )
            |> type(:float),
          signal: :diversity,
          # Count how many NON-matching tools they use
          different_tools:
            fragment(
              "COUNT(DISTINCT CASE WHEN ? NOT IN (SELECT unnest(?::uuid[])) THEN ? END)",
              pat.ai_tool_id,
              ^user_tools_list,
              pat.ai_tool_id
            ),
          different_stacks:
            fragment(
              "COUNT(DISTINCT CASE WHEN ? NOT IN (SELECT unnest(?::uuid[])) THEN ? END)",
              pts.tech_stack_id,
              ^user_stacks_list,
              pts.tech_stack_id
            )
        },
        # Must have at least some different tech
        having:
          fragment(
            """
            COUNT(DISTINCT CASE WHEN ? NOT IN (SELECT unnest(?::uuid[])) THEN ? END) > 0 OR
            COUNT(DISTINCT CASE WHEN ? NOT IN (SELECT unnest(?::uuid[])) THEN ? END) > 0
            """,
            pat.ai_tool_id,
            ^user_tools_list,
            pat.ai_tool_id,
            pts.tech_stack_id,
            ^user_stacks_list,
            pts.tech_stack_id
          ),
        order_by: [desc: fragment("LN(COALESCE(COUNT(DISTINCT ?), 0) + 1)", f.id)],
        limit: ^limit
      )
      |> Repo.all()
      |> Enum.map(fn result ->
        # Simplify to standard format
        %{user_id: result.user_id, score: result.score, signal: :diversity}
      end)
    end
  rescue
    # If query fails (e.g., empty arrays issue), return empty
    _ -> []
  end

  # Fallback for new users with no social graph
  defp popular_creators_fallback(user_id, limit) do
    recent_cutoff = DateTime.add(DateTime.utc_now(), -7, :day)

    from(u in User,
      left_join: f in Follow,
      on: f.following_id == u.id,
      left_join: p in Backend.Content.Post,
      on: p.user_id == u.id and p.inserted_at > ^recent_cutoff,
      left_join: proj in Project,
      on: proj.user_id == u.id and proj.published_at > ^recent_cutoff,
      where:
        u.id != ^user_id and
          u.id not in subquery(
            from f in Follow,
              where: f.follower_id == ^user_id,
              select: f.following_id
          ),
      group_by: u.id,
      having:
        count(f.id, :distinct) > 0 and
          (count(p.id, :distinct) > 0 or count(proj.id, :distinct) > 0),
      order_by: [desc: count(f.id, :distinct)],
      limit: ^limit,
      select: u
    )
    |> Repo.all()
  end

  defp load_users(scored_users) do
    user_ids = Enum.map(scored_users, & &1.user_id)

    users =
      from(u in User, where: u.id in ^user_ids)
      |> Repo.all()
      |> Map.new(fn u -> {u.id, u} end)

    Enum.map(scored_users, fn %{user_id: id, final_score: _score} ->
      Map.get(users, id)
    end)
    |> Enum.filter(&(&1 != nil))
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
