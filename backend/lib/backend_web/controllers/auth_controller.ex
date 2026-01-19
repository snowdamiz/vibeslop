defmodule BackendWeb.AuthController do
  use BackendWeb, :controller
  plug Ueberauth

  alias Backend.Accounts
  alias Backend.Auth.Token

  @doc """
  Initiates the OAuth request. This is handled by Ueberauth.
  If we reach this function, Ueberauth didn't redirect (likely missing OAuth config).
  """
  def request(conn, %{"provider" => provider}) do
    # If we reach here, Ueberauth didn't redirect - likely missing OAuth config
    conn
    |> put_status(:service_unavailable)
    |> json(%{
      error: "oauth_not_configured",
      message: "OAuth provider '#{provider}' is not properly configured. Please check server environment variables.",
      hint: "Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set"
    })
  end

  @doc """
  Handles the OAuth callback from GitHub.
  Creates or finds the user and returns a JWT token.
  """
  def callback(%{assigns: %{ueberauth_failure: fails}} = conn, _params) do
    conn
    |> put_status(:unauthorized)
    |> json(%{
      error: "authentication_failed",
      message: "Failed to authenticate with GitHub",
      details: inspect(fails)
    })
  end

  def callback(%{assigns: %{ueberauth_auth: auth}} = conn, _params) do
    case Accounts.find_or_create_from_github(auth) do
      {:ok, user} ->
        case Token.generate_token(user.id) do
          {:ok, token, _claims} ->
            # Redirect to frontend with token
            frontend_url = get_frontend_url()
            redirect(conn, external: "#{frontend_url}/auth/callback?token=#{token}")

          {:error, reason} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "token_generation_failed", message: inspect(reason)})
        end

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: "user_creation_failed",
          message: "Failed to create user",
          errors: format_changeset_errors(changeset)
        })

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "authentication_failed", message: inspect(reason)})
    end
  end

  @doc """
  Returns the current authenticated user.
  Requires authentication via the Auth plug.
  """
  def me(conn, _params) do
    user = conn.assigns.current_user

    conn
    |> put_status(:ok)
    |> json(%{
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      location: user.location,
      website_url: user.website_url,
      twitter_handle: user.twitter_handle,
      github_username: user.github_username,
      avatar_url: user.avatar_url,
      banner_url: user.banner_url,
      is_verified: user.is_verified
    })
  end

  @doc """
  Logs out the user (client should delete the token).
  """
  def logout(conn, _params) do
    conn
    |> put_status(:ok)
    |> json(%{message: "Logged out successfully"})
  end

  defp get_frontend_url do
    Application.get_env(:backend, :frontend_url) ||
      System.get_env("FRONTEND_URL") ||
      "http://localhost:5173"
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
