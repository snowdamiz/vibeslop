defmodule BackendWeb.PostController do
  use BackendWeb, :controller

  alias Backend.Content
  alias Backend.Content.Post

  action_fallback BackendWeb.FallbackController

  def index(conn, params) do
    feed_type = Map.get(params, "feed", "for-you")
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    search = Map.get(params, "search")
    tools = Map.get(params, "tools", [])
    stacks = Map.get(params, "stacks", [])
    sort_by = Map.get(params, "sort_by", "recent")

    # Get current user if authenticated (from optional auth plug)
    current_user_id = case conn.assigns[:current_user] do
      nil -> nil
      user -> user.id
    end

    case Map.get(params, "type") do
      "explore" ->
        posts = Content.list_explore_posts(
          limit: limit,
          offset: offset,
          search: search,
          tools: tools,
          stacks: stacks,
          sort_by: sort_by
        )
        render(conn, :index, posts: posts)
      _ ->
        # Use unified feed that combines posts and projects
        feed_items = Content.list_unified_feed(
          feed_type: feed_type,
          limit: limit,
          offset: offset,
          current_user_id: current_user_id
        )
        render(conn, :index_unified, feed_items: feed_items)
    end
  end

  def show(conn, %{"id" => id}) do
    # Validate UUID format before querying
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        case Content.get_post!(id) do
          {:ok, post} -> render(conn, :show, post: post)
          {:error, :not_found} ->
            conn
            |> put_status(:not_found)
            |> put_view(json: BackendWeb.ErrorJSON)
            |> render(:"404")
        end
      :error ->
        # Invalid UUID format - return 404
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")
    end
  end

  def create(conn, %{"post" => post_params}) do
    current_user = conn.assigns[:current_user]

    with {:ok, %Post{} = post} <- Content.create_post(current_user.id, post_params) do
      # Fetch the post with associations for proper response
      {:ok, post_data} = Content.get_post!(post.id)

      conn
      |> put_status(:created)
      |> render(:show, post: post_data)
    end
  end

  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Content.delete_post(id, current_user.id) do
      {:ok, _post} ->
        conn
        |> put_status(:no_content)
        |> send_resp(:no_content, "")

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")
    end
  end
end
