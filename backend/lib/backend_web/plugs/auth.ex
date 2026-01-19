defmodule BackendWeb.Plugs.Auth do
  import Plug.Conn
  import Phoenix.Controller

  alias Backend.Accounts
  alias Backend.Auth.Token

  def init(opts), do: opts

  def call(conn, _opts) do
    with {:ok, token} <- extract_token(conn),
         {:ok, claims} <- Token.verify_token(token),
         user_id when not is_nil(user_id) <- Token.get_user_id(claims),
         %Backend.Accounts.User{} = user <- Accounts.get_user(user_id) do
      assign(conn, :current_user, user)
    else
      _ ->
        conn
        |> put_status(:unauthorized)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"401")
        |> halt()
    end
  end

  defp extract_token(conn) do
    case get_req_header(conn, "authorization") do
      ["Bearer " <> token] -> {:ok, token}
      _ -> :error
    end
  end
end
