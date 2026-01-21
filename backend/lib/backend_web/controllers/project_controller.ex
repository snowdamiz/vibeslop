defmodule BackendWeb.ProjectController do
  use BackendWeb, :controller

  alias Backend.Content
  alias Backend.Recommendations

  action_fallback BackendWeb.FallbackController

  def index(conn, params) do
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    search = Map.get(params, "search")
    tools = Map.get(params, "tools", [])
    stacks = Map.get(params, "stacks", [])
    sort_by = Map.get(params, "sort_by", "recent")

    # Get current user for engagement status
    current_user_id =
      case conn.assigns[:current_user] do
        %{id: uid} -> uid
        _ -> nil
      end

    # Use sophisticated trending algorithm if sort_by=trending
    projects =
      if sort_by == "trending" do
        Recommendations.trending_projects(
          limit: limit,
          current_user_id: current_user_id
        )
      else
        Content.list_projects(
          limit: limit,
          offset: offset,
          search: search,
          tools: tools,
          stacks: stacks,
          sort_by: sort_by
        )
      end

    render(conn, :index, projects: projects)
  end

  def show(conn, %{"id" => id}) do
    # Validate UUID format before querying
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        case Content.get_project!(id) do
          {:ok, project_data} ->
            # Add engagement status if user is authenticated
            current_user_id =
              case conn.assigns[:current_user] do
                %{id: uid} -> uid
                _ -> nil
              end

            project_data =
              if current_user_id do
                liked = Backend.Social.has_liked?(current_user_id, "Project", id)
                bookmarked = Backend.Social.has_bookmarked?(current_user_id, "Project", id)

                project_data
                |> Map.put(:liked, liked)
                |> Map.put(:bookmarked, bookmarked)
              else
                project_data
                |> Map.put(:liked, false)
                |> Map.put(:bookmarked, false)
              end

            render(conn, :show, project: project_data)

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

  def create(conn, %{"project" => project_params}) do
    user = conn.assigns.current_user

    case Content.create_project(user.id, project_params) do
      {:ok, project} ->
        # Get project with stats for feed rendering
        project_data = %{
          project: project,
          likes_count: 0,
          comments_count: 0
        }

        conn
        |> put_status(:created)
        |> render(:show_feed, project: project_data)

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  def delete(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Content.delete_project(id, current_user.id) do
      {:ok, _project} ->
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
