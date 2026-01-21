defmodule Backend.Mentions do
  @moduledoc """
  Handle @mention parsing and notification creation.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Social

  @doc """
  Extract usernames from content that are mentioned with @.
  Returns a list of unique usernames (without the @ symbol).

  ## Examples

      iex> extract_usernames("Hey @alice and @bob, check this out!")
      ["alice", "bob"]

      iex> extract_usernames("No mentions here")
      []

      iex> extract_usernames("@alice @alice @bob")
      ["alice", "bob"]
  """
  def extract_usernames(content) when is_binary(content) do
    # Regex to match @username pattern (alphanumeric and underscores)
    ~r/@([a-zA-Z0-9_]+)/
    |> Regex.scan(content)
    |> Enum.map(fn [_full, username] -> username end)
    |> Enum.uniq()
  end

  def extract_usernames(_), do: []

  @doc """
  Create mention notifications for all mentioned users in the content.
  Excludes self-mentions (actor mentioning themselves).

  ## Parameters

    - content: The text content containing @mentions
    - actor_id: The user ID who created the content
    - target_type: "Post" or "Project" - where the mention occurred
    - target_id: The ID of the post/project
    - opts: Optional parameters
      - exclude_user_ids: List of user IDs to exclude from notifications

  ## Returns

    {:ok, count} where count is the number of notifications created
  """
  def notify_mentioned_users(content, actor_id, target_type, target_id, opts \\ []) do
    exclude_ids = Keyword.get(opts, :exclude_user_ids, [])

    # Extract usernames from content
    usernames = extract_usernames(content)

    if Enum.empty?(usernames) do
      {:ok, 0}
    else
      # Look up users by username
      query =
        from u in Backend.Accounts.User,
          where: u.username in ^usernames,
          select: u

      users = Repo.all(query)

      # Create content preview (first 100 chars)
      content_preview = String.slice(content, 0, 100)

      # Create notifications for each mentioned user (excluding actor and any specified exclusions)
      notifications_created =
        users
        |> Enum.reject(fn user ->
          user.id == actor_id or user.id in exclude_ids
        end)
        |> Enum.map(fn user ->
          # Create mention notification
          Social.create_notification(%{
            type: "mention",
            user_id: user.id,
            actor_id: actor_id,
            target_type: target_type,
            target_id: target_id,
            content_preview: content_preview,
            read: false
          })
        end)
        |> Enum.filter(fn
          {:ok, _notification} -> true
          _ -> false
        end)
        |> length()

      {:ok, notifications_created}
    end
  end

  @doc """
  Create mention notifications for a list of specific users.
  Similar to notify_mentioned_users but takes a list of user IDs directly.
  """
  def notify_users(user_ids, actor_id, target_type, target_id, content_preview)
      when is_list(user_ids) do
    # Filter out the actor (no self-notifications)
    user_ids = Enum.reject(user_ids, &(&1 == actor_id))

    notifications_created =
      user_ids
      |> Enum.map(fn user_id ->
        Social.create_notification(%{
          type: "mention",
          user_id: user_id,
          actor_id: actor_id,
          target_type: target_type,
          target_id: target_id,
          content_preview: content_preview,
          read: false
        })
      end)
      |> Enum.filter(fn
        {:ok, _notification} -> true
        _ -> false
      end)
      |> length()

    {:ok, notifications_created}
  end
end
