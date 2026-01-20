defmodule Backend.Social do
  @moduledoc """
  The Social context - handles follows, likes, and bookmarks.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Social.{Follow, Like, Bookmark, Repost, Notification, Report, Impression}
  alias Backend.Accounts.User

  ## Follows

  @doc """
  Creates a follow relationship.
  """
  def follow(follower_id, following_id) do
    %Follow{}
    |> Follow.changeset(%{follower_id: follower_id, following_id: following_id})
    |> Repo.insert()
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
        join: u in User, on: f.follower_id == u.id,
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
        join: u in User, on: f.following_id == u.id,
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
  """
  def toggle_like(user_id, likeable_type, likeable_id) do
    query =
      from l in Like,
        where: l.user_id == ^user_id and l.likeable_type == ^likeable_type and l.likeable_id == ^likeable_id

    case Repo.one(query) do
      nil ->
        # Create like
        %Like{}
        |> Like.changeset(%{user_id: user_id, likeable_type: likeable_type, likeable_id: likeable_id})
        |> Repo.insert()
        |> case do
          {:ok, like} -> {:ok, :liked, like}
          error -> error
        end
      like ->
        # Remove like
        Repo.delete(like)
        |> case do
          {:ok, like} -> {:ok, :unliked, like}
          error -> error
        end
    end
  end

  @doc """
  Checks if user has liked a specific item.
  """
  def has_liked?(user_id, likeable_type, likeable_id) do
    query =
      from l in Like,
        where: l.user_id == ^user_id and l.likeable_type == ^likeable_type and l.likeable_id == ^likeable_id,
        select: count(l.id)

    Repo.one(query) > 0
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
      item = case like.likeable_type do
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
    |> Enum.filter(& &1.item != nil)
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
  """
  def toggle_repost(user_id, repostable_type, repostable_id) do
    query =
      from r in Repost,
        where: r.user_id == ^user_id and r.repostable_type == ^repostable_type and r.repostable_id == ^repostable_id

    case Repo.one(query) do
      nil ->
        # Create repost
        %Repost{}
        |> Repost.changeset(%{user_id: user_id, repostable_type: repostable_type, repostable_id: repostable_id})
        |> Repo.insert()
        |> case do
          {:ok, repost} -> {:ok, :reposted, repost}
          error -> error
        end
      repost ->
        # Remove repost
        Repo.delete(repost)
        |> case do
          {:ok, repost} -> {:ok, :unreposted, repost}
          error -> error
        end
    end
  end

  @doc """
  Checks if user has reposted a specific item.
  """
  def has_reposted?(user_id, repostable_type, repostable_id) do
    query =
      from r in Repost,
        where: r.user_id == ^user_id and r.repostable_type == ^repostable_type and r.repostable_id == ^repostable_id,
        select: count(r.id)

    Repo.one(query) > 0
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
      item = case repost.repostable_type do
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
    |> Enum.filter(& &1.item != nil)
  end

  ## Bookmarks

  @doc """
  Toggles a bookmark (creates if doesn't exist, deletes if exists).
  """
  def toggle_bookmark(user_id, bookmarkable_type, bookmarkable_id) do
    query =
      from b in Bookmark,
        where: b.user_id == ^user_id and b.bookmarkable_type == ^bookmarkable_type and b.bookmarkable_id == ^bookmarkable_id

    case Repo.one(query) do
      nil ->
        # Create bookmark
        %Bookmark{}
        |> Bookmark.changeset(%{user_id: user_id, bookmarkable_type: bookmarkable_type, bookmarkable_id: bookmarkable_id})
        |> Repo.insert()
        |> case do
          {:ok, bookmark} -> {:ok, :bookmarked, bookmark}
          error -> error
        end
      bookmark ->
        # Remove bookmark
        Repo.delete(bookmark)
        |> case do
          {:ok, bookmark} -> {:ok, :unbookmarked, bookmark}
          error -> error
        end
    end
  end

  @doc """
  Checks if user has bookmarked a specific item.
  """
  def has_bookmarked?(user_id, bookmarkable_type, bookmarkable_id) do
    query =
      from b in Bookmark,
        where: b.user_id == ^user_id and b.bookmarkable_type == ^bookmarkable_type and b.bookmarkable_id == ^bookmarkable_id,
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
      item = case bookmark.bookmarkable_type do
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
    |> Enum.filter(& &1.item != nil)
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
        where: r.user_id == ^user_id and r.reportable_type == ^reportable_type and r.reportable_id == ^reportable_id,
        select: count(r.id)

    Repo.one(query) > 0
  end

  ## Impressions

  @doc """
  Records an impression for an item (post or project).
  Accepts user_id (for authenticated users) or fingerprint (for anonymous).
  Returns {:ok, impression} if recorded, {:error, :already_impressed} if duplicate.
  """
  def record_impression(impressionable_type, impressionable_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    fingerprint = Keyword.get(opts, :fingerprint)
    ip_address = Keyword.get(opts, :ip_address)

    attrs = %{
      impressionable_type: impressionable_type,
      impressionable_id: impressionable_id,
      user_id: user_id,
      fingerprint: fingerprint,
      ip_address: ip_address
    }

    %Impression{}
    |> Impression.changeset(attrs)
    |> Repo.insert()
    |> case do
      {:ok, impression} -> {:ok, impression}
      {:error, %Ecto.Changeset{errors: errors}} ->
        # Check if it's a duplicate error
        if Keyword.has_key?(errors, :user_id) or Keyword.has_key?(errors, :fingerprint) do
          {:error, :already_impressed}
        else
          {:error, :invalid}
        end
    end
  end

  @doc """
  Checks if a user/fingerprint has already impressed an item.
  """
  def has_impressed?(impressionable_type, impressionable_id, opts \\ []) do
    user_id = Keyword.get(opts, :user_id)
    fingerprint = Keyword.get(opts, :fingerprint)

    query = from i in Impression,
      where: i.impressionable_type == ^impressionable_type and i.impressionable_id == ^impressionable_id

    query = cond do
      user_id != nil ->
        from i in query, where: i.user_id == ^user_id
      fingerprint != nil ->
        from i in query, where: i.fingerprint == ^fingerprint and is_nil(i.user_id)
      true ->
        # No identifier, can't check
        from i in query, where: false
    end

    Repo.exists?(query)
  end
end
