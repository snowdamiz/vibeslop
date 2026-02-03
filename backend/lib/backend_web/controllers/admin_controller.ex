defmodule BackendWeb.AdminController do
  use BackendWeb, :controller
  alias Backend.Accounts

  plug :require_admin

  # Middleware to ensure only admins can access
  defp require_admin(conn, _opts) do
    user = conn.assigns[:current_user]
    
    if user && Accounts.is_admin?(user) do
      conn
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "forbidden", message: "Admin access required"})
      |> halt()
    end
  end

  def list_users(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    search = Map.get(params, "search", "")

    users = Accounts.list_users(limit: limit, offset: offset, search: search)
    total = Accounts.count_users(search: search)

    json(conn, %{
      data: Enum.map(users, &user_to_admin_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def toggle_verified(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, updated_user} = Accounts.toggle_verified(user)
        json(conn, %{data: user_to_admin_json(updated_user)})
    end
  end

  def delete_user(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, _} = Accounts.delete_user(user)
        send_resp(conn, :no_content, "")
    end
  end

  defp user_to_admin_json(user) do
    %{
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      has_onboarded: user.has_onboarded,
      inserted_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end

  # AI Tools CRUD
  def create_ai_tool(conn, %{"name" => name}) do
    alias Backend.Catalog.AiTool
    slug = slugify(name)

    changeset = AiTool.changeset(%AiTool{}, %{name: name, slug: slug})

    case Backend.Repo.insert(changeset) do
      {:ok, tool} ->
        conn
        |> put_status(:created)
        |> json(%{data: %{id: tool.id, name: tool.name, slug: tool.slug}})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_ai_tool(conn, %{"id" => id}) do
    alias Backend.Catalog.AiTool

    case Backend.Repo.get(AiTool, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "AI tool not found"})

      tool ->
        {:ok, _} = Backend.Repo.delete(tool)
        send_resp(conn, :no_content, "")
    end
  end

  # Tech Stacks CRUD
  def create_tech_stack(conn, %{"name" => name} = params) do
    alias Backend.Catalog.TechStack
    slug = slugify(name)
    category = Map.get(params, "category", "other")

    changeset = TechStack.changeset(%TechStack{}, %{name: name, slug: slug, category: category})

    case Backend.Repo.insert(changeset) do
      {:ok, stack} ->
        conn
        |> put_status(:created)
        |> json(%{data: %{id: stack.id, name: stack.name, slug: stack.slug, category: stack.category}})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_tech_stack(conn, %{"id" => id}) do
    alias Backend.Catalog.TechStack

    case Backend.Repo.get(TechStack, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Tech stack not found"})

      stack ->
        {:ok, _} = Backend.Repo.delete(stack)
        send_resp(conn, :no_content, "")
    end
  end

  # Report Management
  def list_reports(conn, params) do
    limit = Map.get(params, "limit", "20") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    status = Map.get(params, "status")
    type = Map.get(params, "type")

    reports = Backend.Social.list_reports(limit: limit, offset: offset, status: status, type: type)
    total = Backend.Social.count_reports(status: status, type: type)

    json(conn, %{
      data: Enum.map(reports, &report_to_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def update_report(conn, %{"id" => id, "status" => status}) do
    case Backend.Social.update_report_status(id, status) do
      {:ok, report} ->
        report = Backend.Repo.preload(report, [:user])
        json(conn, %{data: report_to_json(report)})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Report not found"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_content(conn, %{"id" => id}) do
    case Backend.Social.get_report(id) do
      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Report not found"})

      {:ok, report} ->
        # Delete the reported content based on type
        delete_result =
          case report.reportable_type do
            "Post" -> Backend.Content.admin_delete_post(report.reportable_id)
            "Project" -> Backend.Content.admin_delete_project(report.reportable_id)
            "Comment" -> Backend.Content.admin_delete_comment(report.reportable_id)
            "Gig" -> Backend.Gigs.admin_delete_gig(report.reportable_id)
            _ -> {:error, :unknown_type}
          end

        case delete_result do
          {:ok, _} ->
            # Mark report as resolved
            Backend.Social.update_report_status(id, "resolved")
            json(conn, %{success: true})

          {:error, :not_found} ->
            # Content already deleted, still mark as resolved
            Backend.Social.update_report_status(id, "resolved")
            json(conn, %{success: true, message: "Content already deleted"})

          {:error, _reason} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "delete_failed", message: "Failed to delete content"})
        end
    end
  end

  defp report_to_json(report) do
    %{
      id: report.id,
      reportable_type: report.reportable_type,
      reportable_id: report.reportable_id,
      status: report.status,
      inserted_at: report.inserted_at,
      reporter: %{
        id: report.user.id,
        username: report.user.username,
        display_name: report.user.display_name,
        avatar_url: report.user.avatar_url
      }
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end

  defp slugify(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.trim("-")
  end
end
