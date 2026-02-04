defmodule BackendWeb.Plugs.OptionalAuth do
  @moduledoc """
  Optional authentication plug that sets current_user if authenticated,
  but allows the request to continue even if not authenticated.
  """
  import Plug.Conn

  alias Backend.Accounts
  alias Backend.Auth.Token

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- extract_token(conn),
         {:ok, claims} <- Token.verify_token(token),
         user_id when not is_nil(user_id) <- Token.get_user_id(claims),
         %Backend.Accounts.User{} = user <- Accounts.get_user_with_preferences(user_id) do
      assign(conn, :current_user, user)
    else
      _ ->
        # Don't halt, just continue without current_user
        conn
    end
  end

  defp extract_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> :error
    end
  end
end
