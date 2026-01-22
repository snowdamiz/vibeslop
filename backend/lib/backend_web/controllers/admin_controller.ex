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
end
