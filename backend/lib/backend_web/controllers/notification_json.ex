defmodule BackendWeb.NotificationJSON do
  @doc """
  Renders a list of notifications.
  """
  def index(%{notifications: notifications, unread_count: unread_count, targets_map: targets_map}) do
    %{
      data: for(notification <- notifications, do: data(notification, targets_map)),
      unread_count: unread_count
    }
  end

  @doc """
  Renders a list of grouped notifications (X/Twitter style).
  """
  def index_grouped(%{notifications: notifications, unread_count: unread_count, targets_map: targets_map}) do
    %{
      data: for(notification <- notifications, do: grouped_data(notification, targets_map)),
      unread_count: unread_count
    }
  end

  @doc """
  Renders a single notification.
  """
  def show(%{notification: notification}) do
    # Single notification render - fetch target inline (only used for single notification display)
    %{data: data(notification, %{})}
  end

  defp data(notification, targets_map) do
    %{
      id: notification.id,
      type: notification.type,
      actor: render_actor(notification.actor),
      target: render_target(notification.target_type, notification.target_id, targets_map),
      content: notification.content_preview,
      created_at: format_datetime(notification.inserted_at),
      read: notification.read
    }
  end

  defp grouped_data(notification, targets_map) do
    %{
      id: notification.id,
      type: notification.type,
      actors: Enum.map(notification.actors, &render_actor/1),
      actor_count: notification.actor_count,
      target: render_target(notification.target_type, notification.target_id, targets_map),
      # For quote notifications: action_target is the quote post to navigate to
      action_target: render_action_target(notification.source_id),
      content: notification.content_preview,
      created_at: format_datetime(notification.latest_at),
      read: notification.read,
      is_grouped: notification.is_grouped
    }
  end

  defp render_actor(actor) do
    %{
      id: actor.id,
      username: actor.username,
      display_name: actor.display_name,
      avatar_url: actor.avatar_url,
      initials: get_initials(actor.display_name)
    }
  end

  # Render action_target for quote notifications (the quote post to navigate to)
  defp render_action_target(nil), do: nil

  defp render_action_target(source_id) do
    %{type: "Post", id: source_id}
  end

  defp render_target(nil, _, _targets_map), do: nil

  defp render_target("Post", target_id, targets_map) do
    case Map.get(targets_map, {"Post", target_id}) do
      nil ->
        nil

      post ->
        %{
          type: "Post",
          id: post.id,
          title: nil,
          preview: String.slice(post.content || "", 0, 100)
        }
    end
  end

  defp render_target("Project", target_id, targets_map) do
    case Map.get(targets_map, {"Project", target_id}) do
      nil ->
        nil

      project ->
        %{
          type: "Project",
          id: project.id,
          title: project.title,
          preview: nil
        }
    end
  end

  defp render_target(_, _, _targets_map), do: nil

  defp get_initials(name) do
    name
    |> String.split(" ")
    |> Enum.take(2)
    |> Enum.map(&String.first/1)
    |> Enum.join("")
    |> String.upcase()
  end

  # Format DateTime to ISO 8601 with Z suffix for proper JS parsing
  defp format_datetime(nil), do: nil
  defp format_datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp format_datetime(other), do: other
end
