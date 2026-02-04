defmodule BackendWeb.NotificationController do
  use BackendWeb, :controller

  alias Backend.Social
  alias Backend.Repo
  import Ecto.Query

  action_fallback BackendWeb.FallbackController

  @doc """
  List all notifications for the current user.
  Supports grouped=true query param for X/Twitter-style grouping.
  """
  def index(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    grouped = Map.get(params, "grouped", "true") == "true"

    # Run notifications fetch and unread_count in parallel to save ~200-400ms
    notifications_task = Task.async(fn ->
      if grouped do
        Social.list_grouped_notifications(current_user.id, limit: limit, offset: offset)
      else
        Social.list_notifications(current_user.id, limit: limit, offset: offset)
      end
    end)

    unread_count_task = Task.async(fn ->
      Social.get_unread_count(current_user.id)
    end)

    notifications = Task.await(notifications_task)
    unread_count = Task.await(unread_count_task)

    # Batch preload all notification targets to avoid N+1 queries in JSON rendering
    targets_map = preload_notification_targets(notifications)

    if grouped do
      render(conn, :index_grouped, notifications: notifications, unread_count: unread_count, targets_map: targets_map)
    else
      render(conn, :index, notifications: notifications, unread_count: unread_count, targets_map: targets_map)
    end
  end

  # Batch preload posts and projects referenced by notifications
  # Optimized: includes all necessary associations to avoid lazy-loading during JSON rendering
  # Also runs posts and projects queries in parallel to save ~200-400ms
  defp preload_notification_targets(notifications) do
    # Collect all target references
    {post_ids, project_ids} =
      Enum.reduce(notifications, {[], []}, fn notif, {posts, projects} ->
        case notif.target_type do
          "Post" -> {[notif.target_id | posts], projects}
          "Project" -> {posts, [notif.target_id | projects]}
          _ -> {posts, projects}
        end
      end)

    # Run both preloads in parallel to save ~200-400ms
    posts_task = Task.async(fn ->
      if Enum.empty?(post_ids) do
        []
      else
        from(p in Backend.Content.Post,
          where: p.id in ^Enum.uniq(post_ids),
          preload: [
            :user,
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ]
        )
        |> Repo.all()
      end
    end)

    projects_task = Task.async(fn ->
      if Enum.empty?(project_ids) do
        []
      else
        from(p in Backend.Content.Project,
          where: p.id in ^Enum.uniq(project_ids),
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
      end
    end)

    posts = Task.await(posts_task)
    projects = Task.await(projects_task)

    # Build lookup map: {"Post", id} => post, {"Project", id} => project
    posts_map = Map.new(posts, fn p -> {{"Post", p.id}, p} end)
    projects_map = Map.new(projects, fn p -> {{"Project", p.id}, p} end)

    Map.merge(posts_map, projects_map)
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
