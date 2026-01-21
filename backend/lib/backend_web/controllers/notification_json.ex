defmodule BackendWeb.NotificationJSON do
  alias Backend.Repo

  @doc """
  Renders a list of notifications.
  """
  def index(%{notifications: notifications, unread_count: unread_count}) do
    %{
      data: for(notification <- notifications, do: data(notification)),
      unread_count: unread_count
    }
  end

  @doc """
  Renders a single notification.
  """
  def show(%{notification: notification}) do
    %{data: data(notification)}
  end

  defp data(notification) do
    %{
      id: notification.id,
      type: notification.type,
      actor: render_actor(notification.actor),
      target: render_target(notification.target_type, notification.target_id),
      content: notification.content_preview,
      created_at: format_datetime(notification.inserted_at),
      read: notification.read
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

  defp render_target(nil, _), do: nil

  defp render_target("Post", target_id) do
    case Repo.get(Backend.Content.Post, target_id) do
      nil ->
        nil

      post ->
        %{
          type: "Post",
          id: post.id,
          title: nil,
          preview: String.slice(post.content, 0, 100)
        }
    end
  end

  defp render_target("Project", target_id) do
    case Repo.get(Backend.Content.Project, target_id) do
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

  defp render_target(_, _), do: nil

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
