defmodule BackendWeb.CommentJSON do
  @doc """
  Renders a list of comments with nested replies.
  """
  def index(%{comments: comments}) do
    %{data: for(comment_data <- comments, do: data(comment_data))}
  end

  @doc """
  Renders a single comment.
  """
  def show(%{comment: comment}) do
    %{data: render_single_comment(comment)}
  end

  # Render a comment with replies (from Content.list_comments)
  defp data(%{comment: comment, user: user, likes_count: likes_count, replies: replies, is_liked: is_liked}) do
    %{
      id: comment.id,
      content: comment.content,
      likes: likes_count,
      isLiked: is_liked,
      created_at: format_datetime(comment.inserted_at),
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      },
      replies: Enum.map(replies, &render_reply/1),
      reply_count: length(replies)
    }
  end

  # Render a nested reply
  defp render_reply(%{comment: comment, user: user, likes_count: likes_count, is_liked: is_liked}) do
    %{
      id: comment.id,
      content: comment.content,
      likes: likes_count,
      isLiked: is_liked,
      created_at: format_datetime(comment.inserted_at),
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      },
      reply_to: comment.parent_id
    }
  end

  # Render a single comment (from create action)
  defp render_single_comment(comment) do
    user = comment.user

    %{
      id: comment.id,
      content: comment.content,
      likes: 0,
      created_at: format_datetime(comment.inserted_at),
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      },
      replies: [],
      reply_count: 0
    }
  end

  # Format DateTime to ISO 8601 with Z suffix for proper JS parsing
  defp format_datetime(nil), do: nil
  defp format_datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp format_datetime(other), do: other

  defp get_initials(name) do
    name
    |> String.split(" ")
    |> Enum.take(2)
    |> Enum.map(&String.first/1)
    |> Enum.join("")
    |> String.upcase()
  end
end
