defmodule BackendWeb.ReportController do
  use BackendWeb, :controller

  alias Backend.Social

  action_fallback BackendWeb.FallbackController

  @doc """
  Creates a report for a reportable item (Comment, Post, or Project).
  Requires authentication.
  """
  def create(conn, %{"type" => type, "id" => id}) do
    current_user = conn.assigns[:current_user]

    # Validate UUID format
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        # Capitalize type for consistency with database
        reportable_type = String.capitalize(type)

        # Validate type
        if reportable_type in ["Comment", "Post", "Project"] do
          # Check if already reported
          if Social.has_reported?(current_user.id, reportable_type, id) do
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "You have already reported this #{String.downcase(reportable_type)}"})
          else
            case Social.create_report(current_user.id, reportable_type, id) do
              {:ok, _report} ->
                json(conn, %{success: true})
              {:error, changeset} ->
                conn
                |> put_status(:unprocessable_entity)
                |> json(%{error: "Unable to create report", details: translate_errors(changeset)})
            end
          end
        else
          conn
          |> put_status(:bad_request)
          |> json(%{error: "Invalid reportable type. Must be 'comment', 'post', or 'project'."})
        end
      :error ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "Invalid ID format"})
    end
  end

  defp translate_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
