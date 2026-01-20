defmodule BackendWeb.SearchController do
  use BackendWeb, :controller

  alias Backend.Search

  action_fallback BackendWeb.FallbackController

  @doc """
  Unified search endpoint.
  GET /api/search?q=query&type=top|people|projects|posts
  """
  def index(conn, params) do
    query = Map.get(params, "q", "")
    type = Map.get(params, "type", "top")
    limit = parse_int(Map.get(params, "limit", "20"), 20)
    offset = parse_int(Map.get(params, "offset", "0"), 0)

    # Get current user if authenticated (from optional auth plug)
    current_user_id = case conn.assigns[:current_user] do
      nil -> nil
      user -> user.id
    end

    if String.trim(query) == "" do
      json(conn, %{
        data: %{users: [], projects: [], posts: []},
        meta: %{query: query, total_results: 0}
      })
    else
      case type do
        "top" ->
          results = Search.unified_search(query, limit: limit, current_user_id: current_user_id)
          total = length(results.users) + length(results.projects) + length(results.posts)

          json(conn, %{
            data: results,
            meta: %{query: query, total_results: total}
          })

        "people" ->
          parsed = Search.parse_query(query)
          users = Search.search_users(parsed, limit: limit, offset: offset)

          conn
          |> put_view(json: BackendWeb.UserJSON)
          |> render(:index, users: users)

        "projects" ->
          parsed = Search.parse_query(query)
          projects = Search.search_projects(parsed,
            limit: limit,
            offset: offset,
            current_user_id: current_user_id
          )

          conn
          |> put_view(json: BackendWeb.ProjectJSON)
          |> render(:index, projects: projects)

        "posts" ->
          parsed = Search.parse_query(query)
          posts = Search.search_posts(parsed,
            limit: limit,
            offset: offset,
            current_user_id: current_user_id
          )

          conn
          |> put_view(json: BackendWeb.PostJSON)
          |> render(:index, posts: posts)

        _ ->
          conn
          |> put_status(:bad_request)
          |> json(%{error: "Invalid search type. Must be one of: top, people, projects, posts"})
      end
    end
  end

  @doc """
  Quick suggestions for typeahead.
  GET /api/search/suggestions?q=partial_query
  """
  def suggestions(conn, %{"q" => query} = params) do
    limit = parse_int(Map.get(params, "limit", "5"), 5)

    results = Search.suggestions(query, limit: limit)

    # Format users for JSON serialization
    formatted_users = Enum.map(results.users, fn user ->
      %{
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    end)

    # Format projects for JSON serialization
    formatted_projects = Enum.map(results.projects, fn proj ->
      %{
        id: proj.id,
        title: proj.title,
        user: %{
          username: proj.user.username,
          display_name: proj.user.display_name
        }
      }
    end)

    json(conn, %{data: %{users: formatted_users, projects: formatted_projects}})
  end

  def suggestions(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{error: "Missing required parameter: q"})
  end

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end
  defp parse_int(value, _default) when is_integer(value), do: value
  defp parse_int(_, default), do: default
end
