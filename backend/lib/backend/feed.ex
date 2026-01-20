defmodule Backend.Feed do
  @moduledoc """
  The Feed context - handles feed generation with algorithmic ranking.

  Implements two feed types:
  - "for-you": Algorithmic feed using Twitter-style engagement weights + time decay
  - "following": Chronological feed from followed users

  Uses cursor-based pagination for efficient infinite scroll.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.{Post, Project}
  alias Backend.Social.{Follow, Repost}

  # Twitter/X-style engagement weights (2025)
  @engagement_weights %{
    reposts: 20.0,
    quotes: 15.0,
    comments: 13.5,
    bookmarks: 10.0,
    likes: 1.0
  }

  # Time decay gravity - higher = faster decay
  @time_decay_gravity 1.5

  # How far back to look for candidates (days)
  @candidate_window_days 7

  @doc """
  Returns the "For You" algorithmic feed.

  Combines posts and projects, ranked by engagement score with time decay.

  Options:
  - :limit - Number of items to return (default 20)
  - :cursor - Pagination cursor (score:id format)
  - :current_user_id - For engagement status (liked, bookmarked, etc.)
  """
  def for_you_feed(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    cursor = Keyword.get(opts, :cursor)
    current_user_id = Keyword.get(opts, :current_user_id)

    cutoff = DateTime.add(DateTime.utc_now(), -@candidate_window_days, :day)

    # Build scored posts query
    posts_query = build_scored_posts_query(cutoff)

    # Build scored projects query
    projects_query = build_scored_projects_query(cutoff)

    # Get posts with scores
    posts =
      posts_query
      |> apply_cursor_filter(cursor)
      |> limit(^(limit + 1))
      |> Repo.all()
      |> Enum.map(fn result ->
        post = Repo.preload(result.post, [
          :user,
          :media,
          quoted_post: [:user, :media],
          quoted_project: [:user, :ai_tools, :tech_stacks, :images]
        ])
        %{
          id: post.id,
          type: "post",
          post: post,
          user: post.user,
          score: result.score,
          sort_date: post.inserted_at
        }
      end)

    # Get projects with scores
    projects =
      projects_query
      |> apply_cursor_filter(cursor)
      |> limit(^(limit + 1))
      |> Repo.all()
      |> Enum.map(fn result ->
        project = Repo.preload(result.project, [:user, :ai_tools, :tech_stacks, :images])
        %{
          id: project.id,
          type: "project",
          project: project,
          user: project.user,
          score: result.score,
          sort_date: project.published_at || project.inserted_at
        }
      end)

    # Combine and sort by score
    all_items = (posts ++ projects)
    |> Enum.sort_by(& &1.score, :desc)
    |> Enum.take(limit + 1)

    # Apply diversification to avoid too many posts from same user
    diversified_items = diversify_feed(all_items, limit)

    # Paginate
    paginate_results(diversified_items, limit, current_user_id)
  end

  @doc """
  Returns the "Following" chronological feed.

  Shows posts and projects from users the current user follows.

  Options:
  - :limit - Number of items to return (default 20)
  - :cursor - Pagination cursor (timestamp:id format)
  - :current_user_id - Required for following feed
  """
  def following_feed(user_id, opts \\ []) when is_binary(user_id) do
    limit = Keyword.get(opts, :limit, 20)
    cursor = Keyword.get(opts, :cursor)
    current_user_id = Keyword.get(opts, :current_user_id, user_id)

    # Get followed user IDs
    followed_ids = get_followed_user_ids(user_id)

    if followed_ids == [] do
      %{items: [], next_cursor: nil, has_more: false}
    else
      # Get posts from followed users
      posts =
        from(p in Post,
          join: u in assoc(p, :user),
          where: p.user_id in ^followed_ids,
          select: %{
            id: p.id,
            type: "post",
            post: p,
            user: u,
            sort_date: p.inserted_at
          },
          order_by: [desc: p.inserted_at]
        )
        |> apply_following_cursor_filter(cursor)
        |> limit(^(limit + 1))
        |> Repo.all()
        |> Enum.map(fn result ->
          post = Repo.preload(result.post, [
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ])
          %{result | post: post}
        end)

      # Get projects from followed users
      projects =
        from(proj in Project,
          join: u in assoc(proj, :user),
          where: proj.user_id in ^followed_ids and proj.status == "published",
          select: %{
            id: proj.id,
            type: "project",
            project: proj,
            user: u,
            sort_date: proj.published_at
          },
          order_by: [desc: proj.published_at]
        )
        |> apply_following_cursor_filter(cursor)
        |> limit(^(limit + 1))
        |> Repo.all()
        |> Enum.map(fn result ->
          project = Repo.preload(result.project, [:ai_tools, :tech_stacks, :images])
          %{result | project: project}
        end)

      # Get reposts from followed users
      reposts = get_following_reposts(followed_ids, cursor, limit)

      # Combine and sort by date
      all_items = (posts ++ projects ++ reposts)
      |> Enum.sort_by(& &1.sort_date, {:desc, DateTime})
      |> Enum.take(limit + 1)

      paginate_results(all_items, limit, current_user_id, :following)
    end
  end

  # ============================================================================
  # Private Functions - Query Building
  # ============================================================================

  defp build_scored_posts_query(cutoff) do
    # Use hardcoded weights in SQL to avoid type casting issues
    # Weights: likes=1.0, comments=13.5, reposts=20.0, bookmarks=10.0, quotes=15.0
    # Gravity: 1.5
    from(p in Post,
      join: u in assoc(p, :user),
      where: p.inserted_at > ^cutoff,
      select: %{
        post: p,
        user: u,
        score: fragment("""
          (COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 13.5 + COALESCE(?, 0) * 20.0 +
           COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 15.0) /
          POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.5)
        """,
          p.likes_count,
          p.comments_count,
          p.reposts_count,
          p.bookmarks_count,
          p.quotes_count,
          p.inserted_at
        )
      },
      order_by: [desc: fragment("""
        (COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 13.5 + COALESCE(?, 0) * 20.0 +
         COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 15.0) /
        POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.5)
      """,
        p.likes_count,
        p.comments_count,
        p.reposts_count,
        p.bookmarks_count,
        p.quotes_count,
        p.inserted_at
      )]
    )
  end

  defp build_scored_projects_query(cutoff) do
    # Use hardcoded weights in SQL to avoid type casting issues
    # Weights: likes=1.0, comments=13.5, reposts=20.0, bookmarks=10.0, quotes=15.0
    # Gravity: 1.5
    from(proj in Project,
      join: u in assoc(proj, :user),
      where: proj.status == "published" and proj.published_at > ^cutoff,
      select: %{
        project: proj,
        user: u,
        score: fragment("""
          (COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 13.5 + COALESCE(?, 0) * 20.0 +
           COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 15.0) /
          POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.5)
        """,
          proj.likes_count,
          proj.comments_count,
          proj.reposts_count,
          proj.bookmarks_count,
          proj.quotes_count,
          proj.published_at
        )
      },
      order_by: [desc: fragment("""
        (COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 13.5 + COALESCE(?, 0) * 20.0 +
         COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 15.0) /
        POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.5)
      """,
        proj.likes_count,
        proj.comments_count,
        proj.reposts_count,
        proj.bookmarks_count,
        proj.quotes_count,
        proj.published_at
      )]
    )
  end

  defp get_followed_user_ids(user_id) do
    from(f in Follow,
      where: f.follower_id == ^user_id,
      select: f.following_id
    )
    |> Repo.all()
  end

  defp get_following_reposts(followed_ids, cursor, limit) do
    query = from(r in Repost,
      join: ru in assoc(r, :user),
      where: r.user_id in ^followed_ids,
      select: %{
        id: r.id,
        type: "repost",
        repostable_type: r.repostable_type,
        repostable_id: r.repostable_id,
        reposter: ru,
        sort_date: r.inserted_at
      },
      order_by: [desc: r.inserted_at]
    )
    |> apply_following_cursor_filter(cursor)
    |> limit(^(limit + 1))

    Repo.all(query)
    |> Enum.map(fn repost ->
      load_reposted_item(repost)
    end)
    |> Enum.filter(& &1 != nil)
  end

  defp load_reposted_item(repost) do
    case repost.repostable_type do
      "Post" ->
        case Repo.get(Post, repost.repostable_id) do
          nil -> nil
          post ->
            post = Repo.preload(post, [
              :user,
              :media,
              quoted_post: [:user, :media],
              quoted_project: [:user, :ai_tools, :tech_stacks, :images]
            ])

            %{
              id: repost.id,
              type: "repost",
              post: post,
              user: post.user,
              reposter: repost.reposter,
              sort_date: repost.sort_date
            }
        end

      "Project" ->
        case Repo.get(Project, repost.repostable_id) do
          nil -> nil
          project ->
            project = Repo.preload(project, [:user, :ai_tools, :tech_stacks, :images])

            %{
              id: repost.id,
              type: "repost",
              project: project,
              user: project.user,
              reposter: repost.reposter,
              sort_date: repost.sort_date
            }
        end

      _ -> nil
    end
  end

  # ============================================================================
  # Private Functions - Cursor Pagination
  # ============================================================================

  defp apply_cursor_filter(query, nil), do: query
  defp apply_cursor_filter(query, cursor) do
    case decode_score_cursor(cursor) do
      {:ok, score, _id} ->
        # Filter by score less than cursor score (for descending order)
        from(q in query, having: fragment("? < ?", fragment("score"), ^score))
      _ ->
        query
    end
  end

  defp apply_following_cursor_filter(query, nil), do: query
  defp apply_following_cursor_filter(query, cursor) do
    case decode_timestamp_cursor(cursor) do
      {:ok, timestamp, _id} ->
        from([p] in query, where: p.inserted_at < ^timestamp)
      _ ->
        query
    end
  end

  @doc """
  Encodes a score-based cursor for "for-you" feed pagination.
  Format: "score:id" base64 encoded
  """
  def encode_score_cursor(score, id) when is_float(score) or is_integer(score) do
    "#{score}:#{id}"
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Decodes a score-based cursor.
  """
  def decode_score_cursor(cursor) when is_binary(cursor) do
    with {:ok, decoded} <- Base.url_decode64(cursor, padding: false),
         [score_str, id] <- String.split(decoded, ":", parts: 2),
         {score, _} <- Float.parse(score_str) do
      {:ok, score, id}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  @doc """
  Encodes a timestamp-based cursor for "following" feed pagination.
  Format: "timestamp:id" base64 encoded
  """
  def encode_timestamp_cursor(%DateTime{} = timestamp, id) do
    "#{DateTime.to_iso8601(timestamp)}:#{id}"
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Decodes a timestamp-based cursor.
  """
  def decode_timestamp_cursor(cursor) when is_binary(cursor) do
    with {:ok, decoded} <- Base.url_decode64(cursor, padding: false),
         [timestamp_str, id] <- String.split(decoded, ":", parts: 2),
         {:ok, timestamp, _} <- DateTime.from_iso8601(timestamp_str) do
      {:ok, timestamp, id}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  # ============================================================================
  # Private Functions - Result Processing
  # ============================================================================

  defp diversify_feed(items, limit) do
    # Limit to max 3 consecutive posts from the same user
    {diversified, _} = Enum.reduce(items, {[], %{}}, fn item, {acc, user_counts} ->
      user_id = item.user.id
      count = Map.get(user_counts, user_id, 0)

      if count < 3 and length(acc) < limit do
        {acc ++ [item], Map.put(user_counts, user_id, count + 1)}
      else
        {acc, user_counts}
      end
    end)

    diversified
  end

  defp paginate_results(items, limit, current_user_id, feed_type \\ :for_you) do
    has_more = length(items) > limit
    items = Enum.take(items, limit)

    # Add engagement counts
    items_with_counts = add_engagement_counts(items)

    # Add engagement status if user is authenticated
    items_with_status = if current_user_id do
      add_engagement_status(items_with_counts, current_user_id)
    else
      items_with_counts
    end

    # Generate next cursor
    next_cursor = if has_more and length(items) > 0 do
      last = List.last(items)
      case feed_type do
        :following -> encode_timestamp_cursor(last.sort_date, last.id)
        :for_you -> encode_score_cursor(last.score || 0.0, last.id)
      end
    else
      nil
    end

    %{
      items: items_with_status,
      next_cursor: next_cursor,
      has_more: has_more
    }
  end

  defp add_engagement_counts(items) do
    Enum.map(items, fn item ->
      {item_type, item_id} = get_item_type_and_id(item)

      likes_count = get_count_from_item(item, :likes_count)
      comments_count = get_count_from_item(item, :comments_count)
      reposts_count = Backend.Social.get_reposts_count(item_type, item_id)

      item
      |> Map.put(:likes_count, likes_count)
      |> Map.put(:comments_count, comments_count)
      |> Map.put(:reposts_count, reposts_count)
    end)
  end

  defp get_count_from_item(item, field) do
    cond do
      Map.has_key?(item, :post) and item.post != nil ->
        Map.get(item.post, field, 0)
      Map.has_key?(item, :project) and item.project != nil ->
        Map.get(item.project, field, 0)
      true ->
        0
    end
  end

  defp add_engagement_status(items, user_id) do
    Enum.map(items, fn item ->
      {item_type, item_id} = get_item_type_and_id(item)

      liked = Backend.Social.has_liked?(user_id, item_type, item_id)
      bookmarked = Backend.Social.has_bookmarked?(user_id, item_type, item_id)
      reposted = Backend.Social.has_reposted?(user_id, item_type, item_id)

      item
      |> Map.put(:liked, liked)
      |> Map.put(:bookmarked, bookmarked)
      |> Map.put(:reposted, reposted)
    end)
  end

  defp get_item_type_and_id(item) do
    case item.type do
      "post" -> {"Post", item.post.id}
      "project" -> {"Project", item.project.id}
      "repost" ->
        if Map.has_key?(item, :post) and item.post != nil do
          {"Post", item.post.id}
        else
          {"Project", item.project.id}
        end
    end
  end

  # ============================================================================
  # Public API - Engagement Weights (for testing/tuning)
  # ============================================================================

  @doc """
  Returns the current engagement weights used for scoring.
  """
  def engagement_weights, do: @engagement_weights

  @doc """
  Returns the current time decay gravity.
  """
  def time_decay_gravity, do: @time_decay_gravity

  @doc """
  Calculates the trending score for a given item.
  Useful for debugging and testing.
  """
  def calculate_score(item) do
    {likes, comments, reposts, bookmarks, quotes, inserted_at} = case item do
      %Post{} = post ->
        {post.likes_count || 0, post.comments_count || 0, post.reposts_count || 0,
         post.bookmarks_count || 0, post.quotes_count || 0, post.inserted_at}
      %Project{} = project ->
        {project.likes_count || 0, project.comments_count || 0, project.reposts_count || 0,
         project.bookmarks_count || 0, project.quotes_count || 0, project.published_at || project.inserted_at}
      _ ->
        {0, 0, 0, 0, 0, DateTime.utc_now()}
    end

    weighted_engagement =
      likes * @engagement_weights.likes +
      comments * @engagement_weights.comments +
      reposts * @engagement_weights.reposts +
      bookmarks * @engagement_weights.bookmarks +
      quotes * @engagement_weights.quotes

    age_hours = DateTime.diff(DateTime.utc_now(), inserted_at, :hour)

    weighted_engagement / :math.pow(age_hours + 2, @time_decay_gravity)
  end
end
