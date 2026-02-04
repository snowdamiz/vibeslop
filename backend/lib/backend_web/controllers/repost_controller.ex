defmodule BackendWeb.RepostController do
  use BackendWeb, :controller

  alias Backend.Social
  alias Backend.Social.{RateLimiter, SpamProtection}

  action_fallback BackendWeb.FallbackController

  def toggle(conn, %{"type" => type, "id" => id}) do
    current_user = conn.assigns[:current_user]

    # Validate UUID format
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        # Check spam protection (account age - stricter for reposts)
        with :ok <- SpamProtection.can_engage?(current_user, :repost),
             # Check rate limiting
             :ok <- RateLimiter.check_repost(current_user.id) do
          # Capitalize type for consistency with database
          repostable_type = String.capitalize(type)

          case Social.toggle_repost(current_user.id, repostable_type, id) do
            {:ok, :reposted, _repost} ->
              json(conn, %{success: true, reposted: true})

            {:ok, :unreposted, _repost} ->
              json(conn, %{success: true, reposted: false})

            {:error, changeset} ->
              conn
              |> put_status(:unprocessable_entity)
              |> json(%{error: "Unable to toggle repost", details: translate_errors(changeset)})
          end
        else
          {:error, :account_too_new} ->
            hours_left = SpamProtection.hours_until_allowed(current_user, :repost)

            conn
            |> put_status(:forbidden)
            |> json(%{
              error: "Account too new",
              message: "Please wait #{hours_left} more hour(s) before reposting content"
            })

          {:error, :rate_limited} ->
            conn
            |> put_status(:too_many_requests)
            |> json(%{error: "Rate limited", message: "Too many reposts. Please slow down."})
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
