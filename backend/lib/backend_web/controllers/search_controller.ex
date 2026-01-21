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
    current_user_id =
      case conn.assigns[:current_user] do
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

          # Format results for JSON serialization
          formatted_users =
            Enum.map(results.users, fn user ->
              %{
                id: user.id,
                username: user.username,
                display_name: user.display_name,
                bio: user.bio,
                avatar_url: user.avatar_url,
                is_verified: user.is_verified
              }
            end)

          formatted_projects =
            Enum.map(results.projects, fn %{project: proj, user: user} = data ->
              %{
                id: proj.id,
                title: proj.title,
                description: truncate_text(proj.description, 200),
                image: get_first_image(proj),
                likes: Map.get(data, :likes_count, 0),
                comments: Map.get(data, :comments_count, 0),
                author: %{
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url,
                  is_verified: user.is_verified
                }
              }
            end)

          formatted_posts =
            Enum.map(results.posts, fn %{post: post, user: user} = data ->
              %{
                id: post.id,
                content: truncate_text(post.content, 200),
                likes: Map.get(data, :likes_count, 0),
                comments: Map.get(data, :comments_count, 0),
                author: %{
                  id: user.id,
                  username: user.username,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url,
                  is_verified: user.is_verified
                }
              }
            end)

          json(conn, %{
            data: %{users: formatted_users, projects: formatted_projects, posts: formatted_posts},
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

          projects =
            Search.search_projects(parsed,
              limit: limit,
              offset: offset,
              current_user_id: current_user_id
            )

          conn
          |> put_view(json: BackendWeb.ProjectJSON)
          |> render(:index, projects: projects)

        "posts" ->
          parsed = Search.parse_query(query)

          posts =
            Search.search_posts(parsed,
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
    formatted_users =
      Enum.map(results.users, fn user ->
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
    formatted_projects =
      Enum.map(results.projects, fn proj ->
        %{
          id: proj.id,
          title: proj.title,
          image_url: proj.image_url,
          user: %{
            username: proj.user.username,
            display_name: proj.user.display_name
          }
        }
      end)

    # Format posts for JSON serialization
    formatted_posts =
      Enum.map(results.posts, fn post ->
        %{
          id: post.id,
          content: String.slice(post.content || "", 0, 100),
          user: %{
            username: post.user.username,
            display_name: post.user.display_name
          }
        }
      end)

    json(conn, %{
      data: %{users: formatted_users, projects: formatted_projects, posts: formatted_posts}
    })
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

  defp truncate_text(nil, _max_length), do: nil

  defp truncate_text(text, max_length) do
    if String.length(text) <= max_length do
      text
    else
      text
      |> String.slice(0, max_length)
      |> String.trim_trailing()
      |> Kernel.<>("...")
    end
  end

  defp get_first_image(%{images: images}) when is_list(images) and length(images) > 0 do
    case List.first(images) do
      %{url: url} -> url
      _ -> nil
    end
  end

  defp get_first_image(_), do: nil
end
