defmodule BackendWeb.NotificationController do
  use BackendWeb, :controller

  alias Backend.Social

  action_fallback BackendWeb.FallbackController

  @doc """
  List all notifications for the current user.
  """
  def index(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))

    notifications = Social.list_notifications(current_user.id, limit: limit, offset: offset)
    unread_count = Social.get_unread_count(current_user.id)

    render(conn, :index, notifications: notifications, unread_count: unread_count)
  end

  @doc """
  Mark a single notification as read.
  """
  def mark_read(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Social.mark_as_read(id, current_user.id) do
      {:ok, notification} ->
        render(conn, :show, notification: notification)
      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")
    end
  end

  @doc """
  Mark all notifications as read for the current user.
  """
  def mark_all_read(conn, _params) do
    current_user = conn.assigns[:current_user]

    case Social.mark_all_as_read(current_user.id) do
      {:ok, count} ->
        json(conn, %{success: true, updated_count: count})
    end
  end
end
