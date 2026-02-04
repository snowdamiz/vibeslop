defmodule BackendWeb.LikeController do
  use BackendWeb, :controller

  alias Backend.Social
  alias Backend.Social.{RateLimiter, SpamProtection}

  action_fallback BackendWeb.FallbackController

  def toggle(conn, %{"type" => type, "id" => id}) do
    current_user = conn.assigns[:current_user]

    # Validate UUID format
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        # Check spam protection (account age)
        with :ok <- SpamProtection.can_engage?(current_user, :like),
             # Check rate limiting
             :ok <- RateLimiter.check_like(current_user.id) do
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
        else
          {:error, :account_too_new} ->
            hours_left = SpamProtection.hours_until_allowed(current_user, :like)

            conn
            |> put_status(:forbidden)
            |> json(%{
              error: "Account too new",
              message: "Please wait #{hours_left} more hour(s) before liking content"
            })

          {:error, :rate_limited} ->
            conn
            |> put_status(:too_many_requests)
            |> json(%{error: "Rate limited", message: "Too many likes. Please slow down."})
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
