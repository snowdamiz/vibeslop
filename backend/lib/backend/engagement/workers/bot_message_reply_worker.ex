defmodule Backend.Engagement.Workers.BotMessageReplyWorker do
  @moduledoc """
  Oban worker that generates and sends bot replies to direct messages.

  When a user sends a message to a bot, this worker is scheduled with a random
  delay (2-120 minutes) to simulate realistic response times.
  """

  use Oban.Worker,
    queue: :messaging,
    max_attempts: 3

  alias Backend.Repo
  alias Backend.Messaging
  alias Backend.Messaging.{Conversation, Message}
  alias Backend.Accounts.User
  alias Backend.Engagement.MessageReplyGenerator
  alias Backend.Engagement.EngagementBotUser

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "conversation_id" => conversation_id,
          "bot_user_id" => bot_user_id,
          "recipient_user_id" => recipient_user_id
        }
      }) do
    Logger.info(
      "BotMessageReplyWorker: Generating reply for conversation #{conversation_id}"
    )

    # Load the conversation with messages
    with {:ok, _conversation} <- get_conversation(conversation_id),
         {:ok, messages} <- get_conversation_messages(conversation_id),
         {:ok, bot_user} <- get_user(bot_user_id),
         {:ok, recipient_user} <- get_user(recipient_user_id),
         {:ok, reply_text} <- generate_reply(messages, bot_user, recipient_user) do
      # Create the reply message
      case Messaging.create_message(conversation_id, bot_user_id, reply_text) do
        {:ok, _message} ->
          Logger.info(
            "BotMessageReplyWorker: Successfully sent reply in conversation #{conversation_id}"
          )

          :ok

        {:error, reason} ->
          Logger.error(
            "BotMessageReplyWorker: Failed to create reply message: #{inspect(reason)}"
          )

          {:error, reason}
      end
    else
      {:error, reason} ->
        Logger.error("BotMessageReplyWorker: Failed to generate reply: #{inspect(reason)}")
        # Don't retry on certain errors
        if reason in [:conversation_not_found, :user_not_found] do
          :ok
        else
          {:error, reason}
        end
    end
  end

  # Schedule a bot reply with random delay between 2-120 minutes
  @doc """
  Schedules a bot reply to be sent after a random delay.

  Delay is randomized between 2 and 120 minutes to simulate realistic
  human response times.
  """
  def schedule_reply(conversation_id, bot_user_id, recipient_user_id) do
    # Random delay between 2 and 120 minutes (in seconds)
    min_delay_seconds = 2 * 60
    max_delay_seconds = 120 * 60
    delay_seconds = Enum.random(min_delay_seconds..max_delay_seconds)

    Logger.info(
      "BotMessageReplyWorker: Scheduling reply for conversation #{conversation_id} " <>
        "in #{div(delay_seconds, 60)} minutes"
    )

    %{
      conversation_id: conversation_id,
      bot_user_id: bot_user_id,
      recipient_user_id: recipient_user_id
    }
    |> __MODULE__.new(schedule_in: delay_seconds)
    |> Oban.insert()
  end

  # Get conversation by ID
  defp get_conversation(conversation_id) do
    case Repo.get(Conversation, conversation_id) do
      nil -> {:error, :conversation_not_found}
      conversation -> {:ok, conversation}
    end
  end

  # Get messages for a conversation
  defp get_conversation_messages(conversation_id) do
    import Ecto.Query

    messages =
      from(m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [asc: m.inserted_at],
        limit: 20
      )
      |> Repo.all()

    {:ok, messages}
  end

  # Get user by ID
  defp get_user(user_id) do
    case Repo.get(User, user_id) do
      nil -> {:error, :user_not_found}
      user -> {:ok, user}
    end
  end

  # Generate reply using the MessageReplyGenerator
  defp generate_reply(messages, bot_user, recipient_user) do
    # Try to find the engagement bot user config for persona
    import Ecto.Query

    bot_config =
      from(b in EngagementBotUser,
        where: b.user_id == ^bot_user.id
      )
      |> Repo.one()

    persona_type = if bot_config, do: bot_config.persona_type, else: "casual"
    bot_name = bot_user.display_name || bot_user.username
    recipient_name = recipient_user.display_name || recipient_user.username

    MessageReplyGenerator.generate_reply(
      messages,
      persona_type,
      bot_name,
      recipient_name,
      bot_user.id
    )
  end
end
