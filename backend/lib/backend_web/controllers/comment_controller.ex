defmodule BackendWeb.CommentController do
  use BackendWeb, :controller

  alias Backend.Content

  action_fallback BackendWeb.FallbackController

  @doc """
  Lists comments for a commentable resource (Post or Project).
  Public endpoint with optional authentication to show like status.
  """
  def index(conn, %{"type" => type, "id" => id}) do
    # Validate UUID format
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        # Capitalize type for consistency with database
        commentable_type = String.capitalize(type)

        # Validate type
        if commentable_type in ["Post", "Project"] do
          # Get current user ID if authenticated (optional auth)
          current_user_id =
            case conn.assigns[:current_user] do
              %{id: id} -> id
              _ -> nil
            end

          comments = Content.list_comments(commentable_type, id, current_user_id: current_user_id)
          render(conn, :index, comments: comments)
        else
          conn
          |> put_status(:bad_request)
          |> json(%{error: "Invalid commentable type. Must be 'post' or 'project'."})
        end

      :error ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Invalid ID format"})
    end
  end

  @doc """
  Creates a comment on a commentable resource (Post or Project).
  Requires authentication.
  """
  def create(conn, %{"comment" => comment_params}) do
    current_user = conn.assigns[:current_user]

    # Convert string keys to atom keys for Ecto
    attrs = %{
      "commentable_type" => comment_params["commentable_type"],
      "commentable_id" => comment_params["commentable_id"],
      "content" => comment_params["content"],
      "parent_id" => comment_params["parent_id"]
    }

    case Content.create_comment(current_user.id, attrs) do
      {:ok, comment} ->
        # Preload associations for rendering
        comment = Backend.Repo.preload(comment, :user)

        conn
        |> put_status(:created)
        |> render(:show, comment: comment)

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Unable to create comment", details: translate_errors(changeset)})
    end
  end

  @doc """
  Deletes a comment if the current user owns it.
  Requires authentication.
  """
  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Content.delete_comment(id, current_user.id) do
      {:ok, _comment} ->
        send_resp(conn, :no_content, "")

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Comment not found"})

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> json(%{error: "You can only delete your own comments"})
    end
  end

  defp translate_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
