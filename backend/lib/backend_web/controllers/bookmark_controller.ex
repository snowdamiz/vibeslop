defmodule BackendWeb.BookmarkController do
  use BackendWeb, :controller

  alias Backend.Social

  action_fallback BackendWeb.FallbackController

  def toggle(conn, %{"type" => type, "id" => id}) do
    current_user = conn.assigns[:current_user]

    # Validate UUID format
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        # Capitalize type for consistency with database
        bookmarkable_type = String.capitalize(type)

        case Social.toggle_bookmark(current_user.id, bookmarkable_type, id) do
          {:ok, :bookmarked, _bookmark} ->
            json(conn, %{success: true, bookmarked: true})
          {:ok, :unbookmarked, _bookmark} ->
            json(conn, %{success: true, bookmarked: false})
          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "Unable to toggle bookmark", details: translate_errors(changeset)})
        end
      :error ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Invalid ID format"})
    end
  end

  def index(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))

    bookmarks = Social.list_user_bookmarks(current_user.id, limit: limit, offset: offset)

    # Convert bookmarks to feed format with actual counts
    items = Enum.map(bookmarks, fn %{type: type, item: item} ->
      likes_count = Social.get_likes_count(type, item.id)
      reposts_count = Social.get_reposts_count(type, item.id)
      comments_count = get_comments_count(type, item.id)

      case type do
        "Post" ->
          %{
            post: item,
            user: item.user,
            likes_count: likes_count,
            comments_count: comments_count,
            reposts_count: reposts_count
          }
        "Project" ->
          %{
            project: item,
            likes_count: likes_count,
            comments_count: comments_count,
            reposts_count: reposts_count
          }
      end
    end)

    conn
    |> put_view(json: BackendWeb.UserJSON)
    |> render(:index, items: items)
  end

  defp get_comments_count(type, id) do
    Backend.Content.get_comments_count(type, id)
  end

  defp translate_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
