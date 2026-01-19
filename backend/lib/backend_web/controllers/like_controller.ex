defmodule BackendWeb.LikeController do
  use BackendWeb, :controller

  alias Backend.Social

  action_fallback BackendWeb.FallbackController

  def toggle(conn, %{"type" => type, "id" => id}) do
    current_user = conn.assigns[:current_user]

    # Capitalize type for consistency with database
    likeable_type = String.capitalize(type)

    case Social.toggle_like(current_user.id, likeable_type, id) do
      {:ok, :liked, _like} ->
        json(conn, %{success: true, liked: true})
      {:ok, :unliked, _like} ->
        json(conn, %{success: true, liked: false})
      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Unable to toggle like", details: translate_errors(changeset)})
    end
  end

  defp translate_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, _opts} -> msg end)
  end
end
