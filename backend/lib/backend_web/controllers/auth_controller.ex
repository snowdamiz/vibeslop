defmodule BackendWeb.AuthController do
  use BackendWeb, :controller

  # Only use Ueberauth for the callback phase, not the request phase
  # This allows us to customize the authorization URL with prompt=select_account
  plug Ueberauth when action in [:callback]

  alias Backend.Accounts
  alias Backend.Auth.Token
  alias Backend.Social
  alias Backend.Messaging

  @state_param_cookie_name "ueberauth.state_param"

  @doc """
  Initiates the OAuth request by manually constructing the authorization URL.
  This bypasses Ueberauth's automatic redirect to include the prompt parameter,
  which forces GitHub to show the account picker.
  """
  def request(conn, %{"provider" => "github"}) do
    # Build the GitHub authorization URL with prompt=select_account
    # to always show the account picker for multi-account support
    config = Application.get_env(:ueberauth, Ueberauth.Strategy.Github.OAuth, [])
    client_id = Keyword.get(config, :client_id)

    if client_id do
      callback_url = "#{get_backend_url()}/api/auth/github/callback"

      # Generate CSRF state parameter (same as Ueberauth does internally)
      state = :crypto.strong_rand_bytes(24) |> Base.url_encode64() |> binary_part(0, 24)

      params = %{
        client_id: client_id,
        redirect_uri: callback_url,
        scope: "user:email",
        prompt: "select_account",
        state: state
      }

      authorize_url = "https://github.com/login/oauth/authorize?" <> URI.encode_query(params)

      conn
      |> put_resp_cookie(@state_param_cookie_name, state, same_site: "Lax")
      |> redirect(external: authorize_url)
    else
      conn
      |> put_status(:service_unavailable)
      |> json(%{
        error: "oauth_not_configured",
        message: "OAuth provider 'github' is not properly configured. Please check server environment variables.",
        hint: "Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are set"
      })
    end
  end

  def request(conn, %{"provider" => provider}) do
    conn
    |> put_status(:service_unavailable)
    |> json(%{
      error: "oauth_not_configured",
      message: "OAuth provider '#{provider}' is not supported.",
      hint: "Only 'github' is currently supported"
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
      is_verified: user.is_verified,
      has_onboarded: user.has_onboarded
    })
  end

  @doc """
  Updates the current authenticated user's profile.
  """
  def update(conn, %{"user" => user_params}) do
    current_user = conn.assigns.current_user

    case Accounts.update_user(current_user, user_params) do
      {:ok, user} ->
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
          is_verified: user.is_verified,
          has_onboarded: user.has_onboarded
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: "update_failed",
          message: "Failed to update profile",
          errors: format_changeset_errors(changeset)
        })
    end
  end

  @doc """
  Logs out the user (client should delete the token).
  """
  def logout(conn, _params) do
    conn
    |> put_status(:ok)
    |> json(%{message: "Logged out successfully"})
  end

  @doc """
  Completes user onboarding with profile customization.
  """
  def onboard(conn, %{"user" => user_params}) do
    current_user = conn.assigns.current_user

    case Accounts.complete_onboarding(current_user, user_params) do
      {:ok, user} ->
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
          is_verified: user.is_verified,
          has_onboarded: user.has_onboarded
        })

      {:error, %Ecto.Changeset{} = changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{
          error: "onboarding_failed",
          message: "Failed to complete onboarding",
          errors: format_changeset_errors(changeset)
        })
    end
  end

  @doc """
  Returns unread counts for notifications and messages.
  """
  def counts(conn, _params) do
    user = conn.assigns.current_user

    notification_count = Social.get_unread_count(user.id)
    message_count = Messaging.get_unread_count(user.id)

    conn
    |> put_status(:ok)
    |> json(%{
      notifications: notification_count,
      messages: message_count
    })
  end

  defp get_frontend_url do
    Application.get_env(:backend, :frontend_url) ||
      System.get_env("FRONTEND_URL") ||
      "http://localhost:5173"
  end

  defp get_backend_url do
    Application.get_env(:backend, :backend_url) ||
      System.get_env("BACKEND_URL") ||
      "http://localhost:4001"
  end

  defp format_changeset_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end
end
