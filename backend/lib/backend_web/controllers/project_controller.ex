defmodule BackendWeb.ProjectController do
  use BackendWeb, :controller

  alias Backend.Content

  action_fallback BackendWeb.FallbackController

  def index(conn, params) do
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    search = Map.get(params, "search")
    tools = Map.get(params, "tools", [])
    stacks = Map.get(params, "stacks", [])
    sort_by = Map.get(params, "sort_by", "recent")

    projects = Content.list_projects(
      limit: limit,
      offset: offset,
      search: search,
      tools: tools,
      stacks: stacks,
      sort_by: sort_by
    )

    render(conn, :index, projects: projects)
  end

  def show(conn, %{"id" => id}) do
    case Content.get_project!(id) do
      {:ok, project} -> render(conn, :show, project: project)
      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")
    end
  end
end
