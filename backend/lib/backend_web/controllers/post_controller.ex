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

    posts = case Map.get(params, "type") do
      "explore" ->
        Content.list_explore_posts(
          limit: limit,
          offset: offset,
          search: search,
          tools: tools,
          stacks: stacks,
          sort_by: sort_by
        )
      _ ->
        Content.list_feed_posts(
          feed_type: feed_type,
          limit: limit,
          offset: offset
        )
    end

    render(conn, :index, posts: posts)
  end

  def show(conn, %{"id" => id}) do
    case Content.get_post!(id) do
      {:ok, post} -> render(conn, :show, post: post)
      {:error, :not_found} ->
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
end
