defmodule Backend.Social do
  @moduledoc """
  The Social context - handles follows, likes, and bookmarks.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Social.{Follow, Like, Bookmark, Repost, Notification, Report, Impression}
  alias Backend.Accounts.User

  # ============================================================================
  # Content Ownership Helpers (for self-engagement prevention)
  # ============================================================================

  @doc """
  Checks if a user owns a specific piece of content.
  Used to prevent self-engagement (liking, reposting, bookmarking own content).
  Optimized: uses EXISTS query instead of loading entire record.
  """
  def owns_content?(user_id, "Post", content_id) do
    from(p in Backend.Content.Post,
      where: p.id == ^content_id and p.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  def owns_content?(user_id, "Project", content_id) do
    from(p in Backend.Content.Project,
      where: p.id == ^content_id and p.user_id == ^user_id
    )
    |> Repo.exists?()
  end

  def owns_content?(_user_id, _type, _content_id), do: false

  @doc """
  Counts self-engagement for a piece of content.
  Returns counts of likes, reposts, and bookmarks made by the content owner.
  Used by feed algorithm to discount self-engagement from scoring.
  """
  def count_self_engagement(content_type, content_id) do
    owner_id = get_content_owner_id(content_type, content_id)

    if owner_id do
      %{
        self_likes: count_self_likes(owner_id, content_type, content_id),
        self_reposts: count_self_reposts(owner_id, content_type, content_id),
        self_bookmarks: count_self_bookmarks(owner_id, content_type, content_id)
      }
    else
      %{self_likes: 0, self_reposts: 0, self_bookmarks: 0}
    end
  end

  @doc """
  Checks if a specific engagement is self-engagement.
  """
  def is_self_like?(user_id, likeable_type, likeable_id) do
    owns_content?(user_id, likeable_type, likeable_id) and
      has_liked?(user_id, likeable_type, likeable_id)
  end

  def is_self_repost?(user_id, repostable_type, repostable_id) do
    owns_content?(user_id, repostable_type, repostable_id) and
      has_reposted?(user_id, repostable_type, repostable_id)
  end

  def is_self_bookmark?(user_id, bookmarkable_type, bookmarkable_id) do
    owns_content?(user_id, bookmarkable_type, bookmarkable_id) and
      has_bookmarked?(user_id, bookmarkable_type, bookmarkable_id)
  end

  # Optimized: only select user_id instead of loading entire record
  defp get_content_owner_id("Post", content_id) do
    from(p in Backend.Content.Post,
      where: p.id == ^content_id,
      select: p.user_id
    )
    |> Repo.one()
  end

  defp get_content_owner_id("Project", content_id) do
    from(p in Backend.Content.Project,
      where: p.id == ^content_id,
      select: p.user_id
    )
    |> Repo.one()
  end

  defp get_content_owner_id(_, _), do: nil

  defp count_self_likes(owner_id, content_type, content_id) do
    from(l in Like,
      where:
        l.user_id == ^owner_id and l.likeable_type == ^content_type and
          l.likeable_id == ^content_id,
      select: count(l.id)
    )
    |> Repo.one()
  end

  defp count_self_reposts(owner_id, content_type, content_id) do
    from(r in Repost,
      where:
        r.user_id == ^owner_id and r.repostable_type == ^content_type and
          r.repostable_id == ^content_id,
      select: count(r.id)
    )
    |> Repo.one()
  end

  defp count_self_bookmarks(owner_id, content_type, content_id) do
    from(b in Bookmark,
      where:
        b.user_id == ^owner_id and b.bookmarkable_type == ^content_type and
          b.bookmarkable_id == ^content_id,
      select: count(b.id)
    )
    |> Repo.one()
  end

  ## Follows

  @doc """
  Creates a follow relationship.
  """
  def follow(follower_id, following_id) do
    result =
      %Follow{}
      |> Follow.changeset(%{follower_id: follower_id, following_id: following_id})
      |> Repo.insert()

    case result do
      {:ok, follow} ->
        # Create follow notification (follower_id is the actor, following_id is notified)
        create_notification(%{
          type: "follow",
          user_id: following_id,
          actor_id: follower_id,
          target_type: nil,
          target_id: nil,
          read: false
        })
        {:ok, follow}

      error ->
        error
    end
  end

  @doc """
  Deletes a follow relationship.
  """
  def unfollow(follower_id, following_id) do
    query =
      from f in Follow,
        where: f.follower_id == ^follower_id and f.following_id == ^following_id

    case Repo.one(query) do
      nil -> {:error, :not_found}
      follow -> Repo.delete(follow)
    end
  end

  @doc """
  Checks if follower_id is following following_id.
  """
  def is_following?(follower_id, following_id) do
    query =
      from f in Follow,
        where: f.follower_id == ^follower_id and f.following_id == ^following_id,
        select: count(f.id)

    Repo.one(query) > 0
  end

  @doc """
  Gets follower and following counts for a user.
  """
  def get_user_stats(user_id) do
    followers_query = from f in Follow, where: f.following_id == ^user_id, select: count(f.id)
    following_query = from f in Follow, where: f.follower_id == ^user_id, select: count(f.id)

    %{
      followers_count: Repo.one(followers_query),
      following_count: Repo.one(following_query)
    }
  end

  @doc """
  Lists users who follow the given user.
  """
  def list_followers(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from f in Follow,
        join: u in User,
        on: f.follower_id == u.id,
        where: f.following_id == ^user_id,
        select: u,
        order_by: [desc: f.inserted_at],
        limit: ^limit,
        offset: ^offset

    Repo.all(query)
  end

  @doc """
  Lists users who are followed by the given user.
  """
  def list_following(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from f in Follow,
        join: u in User,
        on: f.following_id == u.id,
        where: f.follower_id == ^user_id,
        select: u,
        order_by: [desc: f.inserted_at],
        limit: ^limit,
        offset: ^offset

    Repo.all(query)
  end

  ## Likes

  @doc """
  Toggles a like (creates if doesn't exist, deletes if exists).
  Self-likes are allowed but discounted in feed algorithm scoring.
  """
  def toggle_like(user_id, likeable_type, likeable_id) do
    query =
      from l in Like,
        where:
          l.user_id == ^user_id and l.likeable_type == ^likeable_type and
            l.likeable_id == ^likeable_id

    case Repo.one(query) do
      nil ->
        # Create like
        result =
          %Like{}
          |> Like.changeset(%{
            user_id: user_id,
            likeable_type: likeable_type,
            likeable_id: likeable_id
          })
          |> Repo.insert()

        case result do
          {:ok, like} ->
            # Increment counter and record hourly engagement
            Backend.Metrics.increment_counter(likeable_type, likeable_id, :likes_count)
            Backend.Metrics.record_hourly_engagement(likeable_type, likeable_id, :likes)
            # Create notification for content owner
            create_engagement_notification(user_id, likeable_type, likeable_id, "like")
            {:ok, :liked, like}

          error ->
            error
        end

      like ->
        # Remove like
        result = Repo.delete(like)

        case result do
          {:ok, like} ->
            # Decrement counter
            Backend.Metrics.decrement_counter(likeable_type, likeable_id, :likes_count)
            {:ok, :unliked, like}

          error ->
            error
        end
    end
  end

  @doc """
  Checks if user has liked a specific item.
  """
  def has_liked?(user_id, likeable_type, likeable_id) do
    query =
      from l in Like,
        where:
          l.user_id == ^user_id and l.likeable_type == ^likeable_type and
            l.likeable_id == ^likeable_id,
        select: count(l.id)

    Repo.one(query) > 0
  end

  @doc """
  Batch check which items a user has liked.
  Takes a list of {type, id} tuples and returns a MapSet of liked {type, id} tuples.
  Optimized: uses single query with OR conditions instead of one query per type.
  """
  def batch_liked_items(user_id, items) when is_list(items) do
    if Enum.empty?(items) do
      MapSet.new()
    else
      # Build OR conditions for all type/id pairs in a single query
      by_type = Enum.group_by(items, fn {type, _id} -> type end, fn {_type, id} -> id end)

      # Use dynamic query building with OR conditions
      conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([l], ^acc or (l.likeable_type == ^type and l.likeable_id in ^ids))
        end)

      from(l in Like,
        where: l.user_id == ^user_id,
        where: ^conditions,
        select: {l.likeable_type, l.likeable_id}
      )
      |> Repo.all()
      |> MapSet.new()
    end
  end

  @doc """
  Batch check which items a user has bookmarked.
  Takes a list of {type, id} tuples and returns a MapSet of bookmarked {type, id} tuples.
  Optimized: uses single query with OR conditions instead of one query per type.
  """
  def batch_bookmarked_items(user_id, items) when is_list(items) do
    if Enum.empty?(items) do
      MapSet.new()
    else
      by_type = Enum.group_by(items, fn {type, _id} -> type end, fn {_type, id} -> id end)

      conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([b], ^acc or (b.bookmarkable_type == ^type and b.bookmarkable_id in ^ids))
        end)

      from(b in Bookmark,
        where: b.user_id == ^user_id,
        where: ^conditions,
        select: {b.bookmarkable_type, b.bookmarkable_id}
      )
      |> Repo.all()
      |> MapSet.new()
    end
  end

  @doc """
  Batch check which items a user has reposted.
  Takes a list of {type, id} tuples and returns a MapSet of reposted {type, id} tuples.
  Optimized: uses single query with OR conditions instead of one query per type.
  """
  def batch_reposted_items(user_id, items) when is_list(items) do
    if Enum.empty?(items) do
      MapSet.new()
    else
      by_type = Enum.group_by(items, fn {type, _id} -> type end, fn {_type, id} -> id end)

      conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([r], ^acc or (r.repostable_type == ^type and r.repostable_id in ^ids))
        end)

      from(r in Repost,
        where: r.user_id == ^user_id,
        where: ^conditions,
        select: {r.repostable_type, r.repostable_id}
      )
      |> Repo.all()
      |> MapSet.new()
    end
  end

  @doc """
  Batch check all engagement statuses (liked, bookmarked, reposted) for items in a single query.
  Takes a list of {type, id} tuples and returns a map with :liked, :bookmarked, :reposted MapSets.
  Optimized: uses UNION ALL to fetch all 3 statuses in 1 query instead of 3 queries.
  """
  def batch_all_engagement_status(user_id, items) when is_list(items) do
    if Enum.empty?(items) do
      %{liked: MapSet.new(), bookmarked: MapSet.new(), reposted: MapSet.new()}
    else
      by_type = Enum.group_by(items, fn {type, _id} -> type end, fn {_type, id} -> id end)

      # Build conditions for likes
      like_conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([l], ^acc or (l.likeable_type == ^type and l.likeable_id in ^ids))
        end)

      # Build conditions for bookmarks
      bookmark_conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([b], ^acc or (b.bookmarkable_type == ^type and b.bookmarkable_id in ^ids))
        end)

      # Build conditions for reposts
      repost_conditions =
        Enum.reduce(by_type, dynamic(false), fn {type, ids}, acc ->
          dynamic([r], ^acc or (r.repostable_type == ^type and r.repostable_id in ^ids))
        end)

      # Query 1: Likes
      likes_query =
        from(l in Like,
          where: l.user_id == ^user_id,
          where: ^like_conditions,
          select: %{status: "liked", item_type: l.likeable_type, item_id: l.likeable_id}
        )

      # Query 2: Bookmarks
      bookmarks_query =
        from(b in Bookmark,
          where: b.user_id == ^user_id,
          where: ^bookmark_conditions,
          select: %{status: "bookmarked", item_type: b.bookmarkable_type, item_id: b.bookmarkable_id}
        )

      # Query 3: Reposts
      reposts_query =
        from(r in Repost,
          where: r.user_id == ^user_id,
          where: ^repost_conditions,
          select: %{status: "reposted", item_type: r.repostable_type, item_id: r.repostable_id}
        )

      # Combine with UNION ALL for single query execution
      combined_query =
        likes_query
        |> union_all(^bookmarks_query)
        |> union_all(^reposts_query)

      results = Repo.all(combined_query)

      # Partition results into separate MapSets
      Enum.reduce(results, %{liked: MapSet.new(), bookmarked: MapSet.new(), reposted: MapSet.new()}, fn row, acc ->
        key = {row.item_type, row.item_id}
        case row.status do
          "liked" -> %{acc | liked: MapSet.put(acc.liked, key)}
          "bookmarked" -> %{acc | bookmarked: MapSet.put(acc.bookmarked, key)}
          "reposted" -> %{acc | reposted: MapSet.put(acc.reposted, key)}
        end
      end)
    end
  end

  @doc """
  Creates a like without toggling. Returns error if already liked.
  Used for simulated engagement where we only want to create, not toggle.
  """
  def create_like(user_id, likeable_type, likeable_id) do
    if has_liked?(user_id, likeable_type, likeable_id) do
      {:error, :already_liked}
    else
      result =
        %Like{}
        |> Like.changeset(%{
          user_id: user_id,
          likeable_type: likeable_type,
          likeable_id: likeable_id
        })
        |> Repo.insert()

      case result do
        {:ok, like} ->
          Backend.Metrics.increment_counter(likeable_type, likeable_id, :likes_count)
          Backend.Metrics.record_hourly_engagement(likeable_type, likeable_id, :likes)
          # Create notification for content owner
          create_engagement_notification(user_id, likeable_type, likeable_id, "like")
          {:ok, like}

        error ->
          error
      end
    end
  end

  @doc """
  Gets count of likes for a specific item.
  """
  def get_likes_count(likeable_type, likeable_id) do
    query =
      from l in Like,
        where: l.likeable_type == ^likeable_type and l.likeable_id == ^likeable_id,
        select: count(l.id)

    Repo.one(query)
  end

  @doc """
  Gets the most recent users who liked a specific item.
  Returns a list of user info (up to limit, default 4) for social proof display.
  """
  def get_recent_likers(likeable_type, likeable_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 4)

    query =
      from l in Like,
        join: u in User,
        on: l.user_id == u.id,
        where: l.likeable_type == ^likeable_type and l.likeable_id == ^likeable_id,
        order_by: [desc: l.inserted_at],
        limit: ^limit,
        select: %{
          id: u.id,
          username: u.username,
          display_name: u.display_name,
          avatar_url: u.avatar_url
        }

    Repo.all(query)
  end

  @doc """
  Lists items liked by a user with pagination.
  Returns mixed list of posts and projects.
  Optimized: uses batch loading instead of N+1 queries.
  """
  def list_user_likes(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from l in Like,
        where: l.user_id == ^user_id,
        order_by: [desc: l.inserted_at],
        limit: ^limit,
        offset: ^offset

    likes = Repo.all(query)

    # Batch load items by type (2 queries instead of N)
    {post_likes, project_likes} =
      Enum.split_with(likes, fn l -> l.likeable_type == "Post" end)

    post_ids = Enum.map(post_likes, & &1.likeable_id)
    project_ids = Enum.map(project_likes, & &1.likeable_id)

    posts_map =
      if post_ids != [] do
        from(p in Backend.Content.Post,
          where: p.id in ^post_ids,
          preload: [:user, :media]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    projects_map =
      if project_ids != [] do
        from(p in Backend.Content.Project,
          where: p.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    # Map likes to loaded items
    likes
    |> Enum.map(fn like ->
      item =
        case like.likeable_type do
          "Post" -> Map.get(posts_map, like.likeable_id)
          "Project" -> Map.get(projects_map, like.likeable_id)
          _ -> nil
        end

      %{
        type: like.likeable_type,
        item: item,
        liked_at: like.inserted_at
      }
    end)
    |> Enum.filter(&(&1.item != nil))
  end

  ## Notifications

  @doc """
  Creates a notification.
  """
  def create_notification(attrs) do
    alias Backend.Social.NotificationCache

    result =
      %Notification{}
      |> Notification.changeset(attrs)
      |> Repo.insert()

    case result do
      {:ok, notification} ->
        # Increment cached unread count for the user
        NotificationCache.increment_unread_count(notification.user_id)
        {:ok, notification}

      error ->
        error
    end
  end

  @doc """
  Creates an engagement notification (like, repost, bookmark) for the content owner.
  Does not create a notification if the actor owns the content (self-engagement).
  """
  def create_engagement_notification(actor_id, target_type, target_id, notification_type, opts \\ []) do
    owner_id = get_content_owner_id(target_type, target_id)
    content_preview = Keyword.get(opts, :content_preview)
    # source_id is used for quote notifications: target_id is original post, source_id is the quote post
    source_id = Keyword.get(opts, :source_id)

    # Don't notify if actor is the owner (self-engagement) or content doesn't exist
    if owner_id && owner_id != actor_id do
      create_notification(%{
        type: notification_type,
        user_id: owner_id,
        actor_id: actor_id,
        target_type: target_type,
        target_id: target_id,
        source_id: source_id,
        content_preview: content_preview,
        read: false
      })
    else
      {:ok, :skipped}
    end
  end

  @doc """
  Lists notifications for a user with pagination.
  """
  def list_notifications(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from n in Notification,
        where: n.user_id == ^user_id,
        order_by: [desc: n.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:actor]

    Repo.all(query)
  end

  @doc """
  Lists grouped notifications for a user (like X/Twitter style).
  Groups by (type, target_type, target_id) and returns aggregated actors.
  Types that can be grouped: like, repost, bookmark, quote
  Types that are not grouped: comment, mention, follow, bid_*, gig_*, review_*

  Optimized with window functions to get groups + top 3 actors in a single query.
  """
  def list_grouped_notifications(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    # Groupable engagement types
    groupable_types = ["like", "repost", "bookmark", "quote"]

    # Fetch more than needed to account for merging, then trim
    fetch_limit = (limit + offset) * 2

    # OPTIMIZED: Single query with window functions to get grouped data + top 3 actors
    # This replaces the previous 2-query approach (grouped_query + batch_fetch)
    grouped_with_actors_query =
      from n in Notification,
        join: actor in assoc(n, :actor),
        where: n.user_id == ^user_id and n.type in ^groupable_types and not is_nil(n.target_id),
        windows: [
          group_window: [partition_by: [n.type, n.target_type, n.target_id], order_by: [desc: n.inserted_at]]
        ],
        select: %{
          notification_id: n.id,
          type: n.type,
          target_type: n.target_type,
          target_id: n.target_id,
          source_id: n.source_id,
          content_preview: n.content_preview,
          inserted_at: n.inserted_at,
          read: n.read,
          actor_id: actor.id,
          actor_username: actor.username,
          actor_display_name: actor.display_name,
          actor_avatar_url: actor.avatar_url,
          row_num: row_number() |> over(:group_window),
          group_count: count(n.id) |> over([partition_by: [n.type, n.target_type, n.target_id]]),
          latest_at: max(n.inserted_at) |> over([partition_by: [n.type, n.target_type, n.target_id]]),
          has_unread: fragment("bool_or(NOT ?) OVER (PARTITION BY ?, ?, ?)", n.read, n.type, n.target_type, n.target_id)
        }

    # Get non-groupable notifications query (comments, mentions, follows, etc.)
    non_grouped_query =
      from n in Notification,
        where: n.user_id == ^user_id and n.type not in ^groupable_types,
        order_by: [desc: n.inserted_at],
        limit: ^fetch_limit,
        preload: [:actor]

    # Run both queries in parallel to save ~100-200ms
    grouped_task = Task.async(fn -> Repo.all(grouped_with_actors_query) end)
    non_grouped_task = Task.async(fn -> Repo.all(non_grouped_query) end)

    raw_results = Task.await(grouped_task)
    non_grouped_results = Task.await(non_grouped_task)

    # Process results: group by (type, target_type, target_id), keep only top 3 actors per group
    grouped_with_actors =
      raw_results
      |> Enum.group_by(fn r -> {r.type, r.target_type, r.target_id} end)
      |> Enum.map(fn {_key, rows} ->
        # First row has the latest notification data (window ordered by inserted_at desc)
        first = List.first(rows)

        # Get unique actors (top 3), already ordered by recency
        actors =
          rows
          |> Enum.filter(fn r -> r.row_num <= 3 end)
          |> Enum.uniq_by(fn r -> r.actor_id end)
          |> Enum.take(3)
          |> Enum.map(fn r ->
            %Backend.Accounts.User{
              id: r.actor_id,
              username: r.actor_username,
              display_name: r.actor_display_name,
              avatar_url: r.actor_avatar_url
            }
          end)

        %{
          id: first.notification_id,
          type: first.type,
          target_type: first.target_type,
          target_id: first.target_id,
          source_id: first.source_id,
          actors: actors,
          actor_count: first.group_count,
          content_preview: first.content_preview,
          latest_at: first.latest_at,
          read: !first.has_unread,
          is_grouped: true
        }
      end)
      |> Enum.sort_by(& &1.latest_at, {:desc, DateTime})
      |> Enum.take(fetch_limit)

    # Convert non-grouped notifications to same format
    non_grouped_formatted =
      Enum.map(non_grouped_results, fn n ->
        %{
          id: n.id,
          type: n.type,
          target_type: n.target_type,
          target_id: n.target_id,
          source_id: n.source_id,
          actors: [n.actor],
          actor_count: 1,
          content_preview: n.content_preview,
          latest_at: n.inserted_at,
          read: n.read,
          is_grouped: false
        }
      end)

    # Merge and sort by latest_at
    all_notifications =
      (grouped_with_actors ++ non_grouped_formatted)
      |> Enum.sort_by(& &1.latest_at, {:desc, DateTime})
      |> Enum.drop(offset)
      |> Enum.take(limit)

    all_notifications
  end

  @doc """
  Marks all notifications in a group as read.
  """
  def mark_group_as_read(user_id, type, target_type, target_id) do
    query =
      from n in Notification,
        where:
          n.user_id == ^user_id and
            n.type == ^type and
            n.target_type == ^target_type and
            n.target_id == ^target_id and
            n.read == false

    {count, _} = Repo.update_all(query, set: [read: true])
    {:ok, count}
  end

  @doc """
  Gets the count of unread notifications for a user.
  Cached with a 30-second TTL for performance.
  """
  def get_unread_count(user_id) do
    alias Backend.Social.NotificationCache

    NotificationCache.get_unread_count(user_id, fn ->
      query =
        from n in Notification,
          where: n.user_id == ^user_id and n.read == false,
          select: count(n.id)

      Repo.one(query)
    end)
  end

  @doc """
  Marks a notification as read.
  """
  def mark_as_read(notification_id, user_id) do
    alias Backend.Social.NotificationCache

    query =
      from n in Notification,
        where: n.id == ^notification_id and n.user_id == ^user_id

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      notification ->
        # Only decrement if it was previously unread
        was_unread = !notification.read

        result =
          notification
          |> Notification.changeset(%{read: true})
          |> Repo.update()

        case result do
          {:ok, updated} ->
            if was_unread do
              NotificationCache.decrement_unread_count(user_id)
            end
            {:ok, updated}

          error ->
            error
        end
    end
  end

  @doc """
  Marks all notifications as read for a user.
  """
  def mark_all_as_read(user_id) do
    alias Backend.Social.NotificationCache

    query =
      from n in Notification,
        where: n.user_id == ^user_id and n.read == false

    {count, _} = Repo.update_all(query, set: [read: true])

    # Invalidate the cache since all are now read
    NotificationCache.invalidate_unread_count(user_id)

    {:ok, count}
  end

  ## Reposts

  @doc """
  Toggles a repost (creates if doesn't exist, deletes if exists).
  Self-reposts are allowed but discounted in feed algorithm scoring.
  """
  def toggle_repost(user_id, repostable_type, repostable_id) do
    query =
      from r in Repost,
        where:
          r.user_id == ^user_id and r.repostable_type == ^repostable_type and
            r.repostable_id == ^repostable_id

    case Repo.one(query) do
      nil ->
        # Create repost
        result =
          %Repost{}
          |> Repost.changeset(%{
            user_id: user_id,
            repostable_type: repostable_type,
            repostable_id: repostable_id
          })
          |> Repo.insert()

        case result do
          {:ok, repost} ->
            # Increment counter and record hourly engagement
            Backend.Metrics.increment_counter(repostable_type, repostable_id, :reposts_count)
            Backend.Metrics.record_hourly_engagement(repostable_type, repostable_id, :reposts)
            # Create notification for content owner
            create_engagement_notification(user_id, repostable_type, repostable_id, "repost")
            {:ok, :reposted, repost}

          error ->
            error
        end

      repost ->
        # Remove repost
        result = Repo.delete(repost)

        case result do
          {:ok, repost} ->
            # Decrement counter
            Backend.Metrics.decrement_counter(repostable_type, repostable_id, :reposts_count)
            {:ok, :unreposted, repost}

          error ->
            error
        end
    end
  end

  @doc """
  Checks if user has reposted a specific item.
  """
  def has_reposted?(user_id, repostable_type, repostable_id) do
    query =
      from r in Repost,
        where:
          r.user_id == ^user_id and r.repostable_type == ^repostable_type and
            r.repostable_id == ^repostable_id,
        select: count(r.id)

    Repo.one(query) > 0
  end

  @doc """
  Creates a repost without toggling. Returns error if already reposted.
  Used for simulated engagement where we only want to create, not toggle.
  """
  def create_repost(user_id, post_id) do
    if has_reposted?(user_id, "Post", post_id) do
      {:error, :already_reposted}
    else
      result =
        %Repost{}
        |> Repost.changeset(%{
          user_id: user_id,
          repostable_type: "Post",
          repostable_id: post_id
        })
        |> Repo.insert()

      case result do
        {:ok, repost} ->
          Backend.Metrics.increment_counter("Post", post_id, :reposts_count)
          Backend.Metrics.record_hourly_engagement("Post", post_id, :reposts)
          # Create notification for content owner
          create_engagement_notification(user_id, "Post", post_id, "repost")
          {:ok, repost}

        error ->
          error
      end
    end
  end

  @doc """
  Gets count of reposts for a specific item.
  """
  def get_reposts_count(repostable_type, repostable_id) do
    query =
      from r in Repost,
        where: r.repostable_type == ^repostable_type and r.repostable_id == ^repostable_id,
        select: count(r.id)

    Repo.one(query)
  end

  @doc """
  Lists items reposted by a user with pagination.
  Returns mixed list of posts and projects.
  Optimized: uses batch loading instead of N+1 queries.
  """
  def list_user_reposts(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from r in Repost,
        where: r.user_id == ^user_id,
        order_by: [desc: r.inserted_at],
        limit: ^limit,
        offset: ^offset

    reposts = Repo.all(query)

    # Batch load items by type (2 queries instead of N)
    {post_reposts, project_reposts} =
      Enum.split_with(reposts, fn r -> r.repostable_type == "Post" end)

    post_ids = Enum.map(post_reposts, & &1.repostable_id)
    project_ids = Enum.map(project_reposts, & &1.repostable_id)

    posts_map =
      if post_ids != [] do
        from(p in Backend.Content.Post,
          where: p.id in ^post_ids,
          preload: [:user, :media]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    projects_map =
      if project_ids != [] do
        from(p in Backend.Content.Project,
          where: p.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    # Map reposts to loaded items
    reposts
    |> Enum.map(fn repost ->
      item =
        case repost.repostable_type do
          "Post" -> Map.get(posts_map, repost.repostable_id)
          "Project" -> Map.get(projects_map, repost.repostable_id)
          _ -> nil
        end

      %{
        type: repost.repostable_type,
        item: item,
        reposted_at: repost.inserted_at
      }
    end)
    |> Enum.filter(&(&1.item != nil))
  end

  ## Bookmarks

  @doc """
  Toggles a bookmark (creates if doesn't exist, deletes if exists).
  Self-bookmarks are allowed but discounted in feed algorithm scoring.
  """
  def toggle_bookmark(user_id, bookmarkable_type, bookmarkable_id) do
    query =
      from b in Bookmark,
        where:
          b.user_id == ^user_id and b.bookmarkable_type == ^bookmarkable_type and
            b.bookmarkable_id == ^bookmarkable_id

    case Repo.one(query) do
      nil ->
        # Create bookmark
        result =
          %Bookmark{}
          |> Bookmark.changeset(%{
            user_id: user_id,
            bookmarkable_type: bookmarkable_type,
            bookmarkable_id: bookmarkable_id
          })
          |> Repo.insert()

        case result do
          {:ok, bookmark} ->
            # Increment counter and record hourly engagement
            Backend.Metrics.increment_counter(
              bookmarkable_type,
              bookmarkable_id,
              :bookmarks_count
            )

            Backend.Metrics.record_hourly_engagement(
              bookmarkable_type,
              bookmarkable_id,
              :bookmarks
            )

            # Create notification for content owner
            create_engagement_notification(user_id, bookmarkable_type, bookmarkable_id, "bookmark")
            {:ok, :bookmarked, bookmark}

          error ->
            error
        end

      bookmark ->
        # Remove bookmark
        result = Repo.delete(bookmark)

        case result do
          {:ok, bookmark} ->
            # Decrement counter
            Backend.Metrics.decrement_counter(
              bookmarkable_type,
              bookmarkable_id,
              :bookmarks_count
            )

            {:ok, :unbookmarked, bookmark}

          error ->
            error
        end
    end
  end

  @doc """
  Creates a bookmark (non-toggle version for bots).
  Returns {:ok, bookmark} or {:error, :already_bookmarked}.
  """
  def create_bookmark(user_id, bookmarkable_type, bookmarkable_id) do
    if has_bookmarked?(user_id, bookmarkable_type, bookmarkable_id) do
      {:error, :already_bookmarked}
    else
      result =
        %Bookmark{}
        |> Bookmark.changeset(%{
          user_id: user_id,
          bookmarkable_type: bookmarkable_type,
          bookmarkable_id: bookmarkable_id
        })
        |> Repo.insert()

      case result do
        {:ok, bookmark} ->
          Backend.Metrics.increment_counter(bookmarkable_type, bookmarkable_id, :bookmarks_count)
          Backend.Metrics.record_hourly_engagement(bookmarkable_type, bookmarkable_id, :bookmarks)
          # Create notification for content owner
          create_engagement_notification(user_id, bookmarkable_type, bookmarkable_id, "bookmark")
          {:ok, bookmark}

        error ->
          error
      end
    end
  end

  @doc """
  Checks if user has bookmarked a specific item.
  """
  def has_bookmarked?(user_id, bookmarkable_type, bookmarkable_id) do
    query =
      from b in Bookmark,
        where:
          b.user_id == ^user_id and b.bookmarkable_type == ^bookmarkable_type and
            b.bookmarkable_id == ^bookmarkable_id,
        select: count(b.id)

    Repo.one(query) > 0
  end

  @doc """
  Lists items bookmarked by a user with pagination.
  Returns mixed list of posts and projects.
  Optimized: uses batch loading instead of N+1 queries.
  """
  def list_user_bookmarks(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from b in Bookmark,
        where: b.user_id == ^user_id,
        order_by: [desc: b.inserted_at],
        limit: ^limit,
        offset: ^offset

    bookmarks = Repo.all(query)

    # Batch load items by type (2 queries instead of N)
    {post_bookmarks, project_bookmarks} =
      Enum.split_with(bookmarks, fn b -> b.bookmarkable_type == "Post" end)

    post_ids = Enum.map(post_bookmarks, & &1.bookmarkable_id)
    project_ids = Enum.map(project_bookmarks, & &1.bookmarkable_id)

    posts_map =
      if post_ids != [] do
        from(p in Backend.Content.Post,
          where: p.id in ^post_ids,
          preload: [:user, :media]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    projects_map =
      if project_ids != [] do
        from(p in Backend.Content.Project,
          where: p.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    # Map bookmarks to loaded items
    bookmarks
    |> Enum.map(fn bookmark ->
      item =
        case bookmark.bookmarkable_type do
          "Post" -> Map.get(posts_map, bookmark.bookmarkable_id)
          "Project" -> Map.get(projects_map, bookmark.bookmarkable_id)
          _ -> nil
        end

      %{
        type: bookmark.bookmarkable_type,
        item: item,
        bookmarked_at: bookmark.inserted_at
      }
    end)
    |> Enum.filter(&(&1.item != nil))
  end

  ## Reports

  @doc """
  Creates a report for a reportable item (Comment, Post, or Project).
  Returns error if user has already reported this item.
  """
  def create_report(user_id, reportable_type, reportable_id) do
    %Report{}
    |> Report.changeset(%{
      user_id: user_id,
      reportable_type: reportable_type,
      reportable_id: reportable_id,
      status: "pending"
    })
    |> Repo.insert()
  end

  @doc """
  Checks if user has already reported a specific item.
  """
  def has_reported?(user_id, reportable_type, reportable_id) do
    query =
      from r in Report,
        where:
          r.user_id == ^user_id and r.reportable_type == ^reportable_type and
            r.reportable_id == ^reportable_id,
        select: count(r.id)

    Repo.one(query) > 0
  end

  @doc """
  Lists reports with pagination and optional filters.
  Used by admin dashboard.
  """
  def list_reports(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status)
    reportable_type = Keyword.get(opts, :type)

    query =
      from r in Report,
        join: u in assoc(r, :user),
        order_by: [desc: r.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:user]

    query =
      if status && status != "",
        do: where(query, [r], r.status == ^status),
        else: query

    query =
      if reportable_type && reportable_type != "",
        do: where(query, [r], r.reportable_type == ^reportable_type),
        else: query

    Repo.all(query)
  end

  @doc """
  Counts total reports with optional filters.
  """
  def count_reports(opts \\ []) do
    status = Keyword.get(opts, :status)
    reportable_type = Keyword.get(opts, :type)

    query = from r in Report, select: count(r.id)

    query =
      if status && status != "",
        do: where(query, [r], r.status == ^status),
        else: query

    query =
      if reportable_type && reportable_type != "",
        do: where(query, [r], r.reportable_type == ^reportable_type),
        else: query

    Repo.one(query)
  end

  @doc """
  Gets a single report by ID with user preloaded.
  """
  def get_report(id) do
    case Repo.get(Report, id) do
      nil -> {:error, :not_found}
      report -> {:ok, Repo.preload(report, [:user])}
    end
  end

  @doc """
  Updates a report's status.
  """
  def update_report_status(report_id, status) do
    case Repo.get(Report, report_id) do
      nil ->
        {:error, :not_found}

      report ->
        report
        |> Report.changeset(%{status: status})
        |> Repo.update()
    end
  end

  ## Impressions

  @doc """
  Records an impression for an item (post or project).
  Accepts user_id (for authenticated users) or fingerprint (for anonymous).
  Returns {:ok, impression} if recorded, {:ok, :already_impressed} if duplicate (no error to avoid transaction abort).
  """
  def record_impression(impressionable_type, impressionable_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    fingerprint = Keyword.get(opts, :fingerprint)
    ip_address = Keyword.get(opts, :ip_address)

    # Check if impression already exists to avoid Postgres error logs
    if has_impressed?(impressionable_type, impressionable_id,
         user_id: user_id,
         fingerprint: fingerprint
       ) do
      {:ok, :already_impressed}
    else
      attrs = %{
        impressionable_type: impressionable_type,
        impressionable_id: impressionable_id,
        user_id: user_id,
        fingerprint: fingerprint,
        ip_address: ip_address
      }

      changeset =
        %Impression{}
        |> Impression.changeset(attrs)
        |> Ecto.Changeset.unique_constraint(:user_id,
          name: :impressions_user_unique_index,
          message: "already impressed"
        )
        |> Ecto.Changeset.unique_constraint(:fingerprint,
          name: :impressions_fingerprint_unique_index,
          message: "already impressed"
        )

      try do
        case Repo.insert(changeset) do
          {:ok, impression} ->
            {:ok, impression}

          {:error, %Ecto.Changeset{} = changeset} ->
            # Check if it's a unique constraint violation (race condition)
            if has_unique_constraint_error?(changeset) do
              {:ok, :already_impressed}
            else
              {:error, :invalid}
            end
        end
      rescue
        # Catch Postgrex errors for unique constraint violations (race condition)
        e in Postgrex.Error ->
          case e.postgres do
            %{code: :unique_violation} -> {:ok, :already_impressed}
            _ -> {:error, :database_error}
          end
      end
    end
  end

  defp has_unique_constraint_error?(changeset) do
    Enum.any?(changeset.errors, fn
      {_field, {msg, _}} -> msg == "already impressed"
      _ -> false
    end)
  end

  @doc """
  Checks if a user/fingerprint has already impressed an item.
  When both user_id and fingerprint are provided, checks for either to catch race conditions.
  """
  def has_impressed?(impressionable_type, impressionable_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    fingerprint = Keyword.get(opts, :fingerprint)

    query =
      from i in Impression,
        where:
          i.impressionable_type == ^impressionable_type and
            i.impressionable_id == ^impressionable_id

    query =
      cond do
        # When both are provided, check for EITHER to catch race conditions
        # (e.g., fingerprint impression sent before authenticated impression)
        user_id != nil && fingerprint != nil ->
          from i in query, where: i.user_id == ^user_id or i.fingerprint == ^fingerprint

        user_id != nil ->
          from i in query, where: i.user_id == ^user_id

        fingerprint != nil ->
          from i in query, where: i.fingerprint == ^fingerprint

        true ->
          # No identifier, can't check
          from i in query, where: false
      end

    Repo.exists?(query)
  end
end
