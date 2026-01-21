defmodule BackendWeb.ConversationJSON do
  @doc """
  Renders a list of conversations.
  """
  def index(%{conversations: conversations, current_user_id: current_user_id}) do
    %{
      data: for(conv_data <- conversations, do: conversation_summary(conv_data, current_user_id))
    }
  end

  @doc """
  Renders a single conversation with messages.
  """
  def show(%{
        conversation: conversation,
        messages: messages,
        other_user: other_user,
        current_user_id: current_user_id
      }) do
    %{
      data: %{
        id: conversation.id,
        participant: render_participant(other_user),
        messages: for(message <- messages, do: render_message(message, current_user_id))
      }
    }
  end

  @doc """
  Renders a newly created conversation.
  """
  def created(%{
        conversation: conversation,
        other_user: other_user,
        current_user_id: _current_user_id
      }) do
    %{
      data: %{
        id: conversation.id,
        participant: render_participant(other_user)
      }
    }
  end

  @doc """
  Renders a single message.
  """
  def message(%{message: message, current_user_id: current_user_id}) do
    %{
      data: render_message(message, current_user_id)
    }
  end

  # Private functions

  defp conversation_summary(
         %{
           conversation: conversation,
           last_message: last_message,
           unread_count: unread_count,
           other_user: other_user
         },
         current_user_id
       ) do
    %{
      id: conversation.id,
      participant: render_participant(other_user),
      last_message:
        if last_message do
          %{
            content: last_message.content,
            timestamp: format_datetime(last_message.inserted_at),
            is_from_me: last_message.sender_id == current_user_id
          }
        else
          nil
        end,
      unread_count: unread_count
    }
  end

  defp render_participant(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      initials: get_initials(user.display_name)
    }
  end

  defp render_message(message, current_user_id) do
    %{
      id: message.id,
      content: message.content,
      timestamp: format_datetime(message.inserted_at),
      is_from_me: message.sender_id == current_user_id
    }
  end

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
