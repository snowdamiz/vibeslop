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
  """
  def owns_content?(user_id, "Post", content_id) do
    case Repo.get(Backend.Content.Post, content_id) do
      nil -> false
      post -> post.user_id == user_id
    end
  end

  def owns_content?(user_id, "Project", content_id) do
    case Repo.get(Backend.Content.Project, content_id) do
      nil -> false
      project -> project.user_id == user_id
    end
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

  defp get_content_owner_id("Post", content_id) do
    case Repo.get(Backend.Content.Post, content_id) do
      nil -> nil
      post -> post.user_id
    end
  end

  defp get_content_owner_id("Project", content_id) do
    case Repo.get(Backend.Content.Project, content_id) do
      nil -> nil
      project -> project.user_id
    end
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

    # Load the actual liked items
    Enum.map(likes, fn like ->
      item =
        case like.likeable_type do
          "Post" ->
            Repo.get(Backend.Content.Post, like.likeable_id)
            |> Repo.preload([:user, :media])

          "Project" ->
            Repo.get(Backend.Content.Project, like.likeable_id)
            |> Repo.preload([:user, :ai_tools, :tech_stacks, :images])

          _ ->
            nil
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
    %Notification{}
    |> Notification.changeset(attrs)
    |> Repo.insert()
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
  """
  def list_grouped_notifications(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    # Groupable engagement types
    groupable_types = ["like", "repost", "bookmark", "quote"]

    # Get grouped notifications for groupable types
    grouped_query =
      from n in Notification,
        where: n.user_id == ^user_id and n.type in ^groupable_types and not is_nil(n.target_id),
        group_by: [n.type, n.target_type, n.target_id],
        select: %{
          type: n.type,
          target_type: n.target_type,
          target_id: n.target_id,
          count: count(n.id),
          latest_at: max(n.inserted_at),
          has_unread: fragment("bool_or(NOT ?)", n.read)
        },
        order_by: [desc: max(n.inserted_at)]

    grouped_results = Repo.all(grouped_query)

    # Get non-groupable notifications (comments, mentions, follows, etc.)
    non_grouped_query =
      from n in Notification,
        where: n.user_id == ^user_id and n.type not in ^groupable_types,
        order_by: [desc: n.inserted_at],
        preload: [:actor]

    non_grouped_results = Repo.all(non_grouped_query)

    # For each grouped notification, fetch the most recent actors (up to 3)
    grouped_with_actors =
      Enum.map(grouped_results, fn group ->
        actors_query =
          from n in Notification,
            join: actor in assoc(n, :actor),
            where:
              n.user_id == ^user_id and
                n.type == ^group.type and
                n.target_type == ^group.target_type and
                n.target_id == ^group.target_id,
            order_by: [desc: n.inserted_at],
            limit: 3,
            select: actor

        actors = Repo.all(actors_query)

        # Get the most recent notification ID for this group (for marking as read)
        latest_notification =
          from(n in Notification,
            where:
              n.user_id == ^user_id and
                n.type == ^group.type and
                n.target_type == ^group.target_type and
                n.target_id == ^group.target_id,
            order_by: [desc: n.inserted_at],
            limit: 1
          )
          |> Repo.one()

        %{
          id: latest_notification && latest_notification.id,
          type: group.type,
          target_type: group.target_type,
          target_id: group.target_id,
          source_id: latest_notification && latest_notification.source_id,
          actors: actors,
          actor_count: group.count,
          content_preview: latest_notification && latest_notification.content_preview,
          latest_at: group.latest_at,
          read: !group.has_unread,
          is_grouped: true
        }
      end)

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
  """
  def get_unread_count(user_id) do
    query =
      from n in Notification,
        where: n.user_id == ^user_id and n.read == false,
        select: count(n.id)

    Repo.one(query)
  end

  @doc """
  Marks a notification as read.
  """
  def mark_as_read(notification_id, user_id) do
    query =
      from n in Notification,
        where: n.id == ^notification_id and n.user_id == ^user_id

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      notification ->
        notification
        |> Notification.changeset(%{read: true})
        |> Repo.update()
    end
  end

  @doc """
  Marks all notifications as read for a user.
  """
  def mark_all_as_read(user_id) do
    query =
      from n in Notification,
        where: n.user_id == ^user_id and n.read == false

    {count, _} = Repo.update_all(query, set: [read: true])
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

    # Load the actual reposted items
    Enum.map(reposts, fn repost ->
      item =
        case repost.repostable_type do
          "Post" ->
            Repo.get(Backend.Content.Post, repost.repostable_id)
            |> Repo.preload([:user, :media])

          "Project" ->
            Repo.get(Backend.Content.Project, repost.repostable_id)
            |> Repo.preload([:user, :ai_tools, :tech_stacks, :images])

          _ ->
            nil
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

    # Load the actual bookmarked items
    Enum.map(bookmarks, fn bookmark ->
      item =
        case bookmark.bookmarkable_type do
          "Post" ->
            Repo.get(Backend.Content.Post, bookmark.bookmarkable_id)
            |> Repo.preload([:user, :media])

          "Project" ->
            Repo.get(Backend.Content.Project, bookmark.bookmarkable_id)
            |> Repo.preload([:user, :ai_tools, :tech_stacks, :images])

          _ ->
            nil
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
