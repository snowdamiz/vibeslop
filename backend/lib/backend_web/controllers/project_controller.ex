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

            # Add recent likers for social proof
            recent_likers = Backend.Social.get_recent_likers("Project", id, limit: 4)
            project_data = Map.put(project_data, :recent_likers, recent_likers)

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

    # Check images for NSFW content before creating project
    images = Map.get(project_params, "images", []) || []

    case moderate_images(images) do
      :ok ->
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

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "content_policy_violation", message: reason})
    end
  end

  # Moderate images for NSFW content
  defp moderate_images([]), do: :ok

  defp moderate_images(images) when is_list(images) do
    alias Backend.AI.ContentModeration

    Enum.reduce_while(images, :ok, fn image, _acc ->
      # Only moderate base64 images, not URLs
      if is_binary(image) and String.starts_with?(image, "data:") do
        case ContentModeration.moderate_image(image) do
          {:ok, :safe} -> {:cont, :ok}
          {:error, :nsfw, reason} -> {:halt, {:error, reason}}
        end
      else
        {:cont, :ok}
      end
    end)
  end

  defp moderate_images(_), do: :ok

  def update(conn, %{"id" => id, "project" => project_params}) do
    current_user = conn.assigns[:current_user]

    # Get existing image URLs from the database to compare
    existing_image_urls =
      case Content.get_project!(id) do
        {:error, :not_found} -> []
        {:ok, %{project: project}} -> Enum.map(project.images || [], & &1.url)
      end

    # Only check NEW images for NSFW content - images already in DB were already checked
    images = Map.get(project_params, "images", []) || []
    new_images = Enum.filter(images, fn image ->
      is_binary(image) and
        String.starts_with?(image, "data:") and
        image not in existing_image_urls
    end)

    case moderate_images(new_images) do
      :ok ->
        case Content.update_project(id, current_user.id, project_params) do
          {:ok, project} ->
            # Get project with stats for rendering
            project_data = %{
              project: project,
              likes_count: project.likes_count || 0,
              comments_count: project.comments_count || 0
            }

            conn
            |> put_status(:ok)
            |> render(:show_feed, project: project_data)

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

          {:error, %Ecto.Changeset{} = changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> put_view(json: BackendWeb.ChangesetJSON)
            |> render(:error, changeset: changeset)
        end

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "content_policy_violation", message: reason})
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
