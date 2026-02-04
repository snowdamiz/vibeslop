defmodule Backend.Messaging do
  @moduledoc """
  The Messaging context - handles conversations and messages.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Messaging.{Conversation, Message}

  @doc """
  Lists all conversations for a user with last message and unread count.
  """
  def list_conversations(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    # Get all conversations where user is a participant
    conversation_query =
      from c in Conversation,
        where: c.user_one_id == ^user_id or c.user_two_id == ^user_id,
        order_by: [desc: c.updated_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:user_one, :user_two]

    conversations = Repo.all(conversation_query)

    # For each conversation, get the last message and unread count
    Enum.map(conversations, fn conversation ->
      last_message = get_last_message(conversation.id)
      unread_count = get_conversation_unread_count(conversation.id, user_id)
      other_user = get_other_user(conversation, user_id)

      %{
        conversation: conversation,
        last_message: last_message,
        unread_count: unread_count,
        other_user: other_user
      }
    end)
  end

  @doc """
  Gets or creates a conversation between two users.
  Checks the recipient's message privacy settings before creating a new conversation.
  """
  def get_or_create_conversation(user_one_id, user_two_id) do
    # Ensure canonical ordering
    {canonical_one, canonical_two} =
      if user_one_id < user_two_id do
        {user_one_id, user_two_id}
      else
        {user_two_id, user_one_id}
      end

    query =
      from c in Conversation,
        where: c.user_one_id == ^canonical_one and c.user_two_id == ^canonical_two,
        preload: [:user_one, :user_two]

    case Repo.one(query) do
      nil ->
        # Conversation doesn't exist, check privacy before creating
        case can_message?(user_one_id, user_two_id) do
          :ok ->
            %Conversation{}
            |> Conversation.changeset(%{user_one_id: user_one_id, user_two_id: user_two_id})
            |> Repo.insert()
            |> case do
              {:ok, conversation} -> {:ok, Repo.preload(conversation, [:user_one, :user_two])}
              error -> error
            end

          {:error, reason} ->
            {:error, reason}
        end

      conversation ->
        {:ok, conversation}
    end
  end

  @doc """
  Checks if sender can message recipient based on recipient's privacy settings.
  Returns :ok if allowed, {:error, :messaging_restricted} if not.
  """
  def can_message?(sender_id, recipient_id) do
    recipient = Repo.get(Backend.Accounts.User, recipient_id)

    case recipient.message_privacy do
      "everyone" ->
        :ok

      "followers" ->
        # Sender must be following recipient (recipient has the sender as a follower)
        if Backend.Social.is_following?(sender_id, recipient_id) do
          :ok
        else
          {:error, :messaging_restricted}
        end

      "following" ->
        # Recipient must be following sender
        if Backend.Social.is_following?(recipient_id, sender_id) do
          :ok
        else
          {:error, :messaging_restricted}
        end

      _ ->
        :ok
    end
  end

  @doc """
  Gets a conversation with messages, ensuring the user is a participant.
  """
  def get_conversation_with_messages(conversation_id, user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)

    # First verify the user is a participant
    conversation_query =
      from c in Conversation,
        where: c.id == ^conversation_id,
        where: c.user_one_id == ^user_id or c.user_two_id == ^user_id,
        preload: [:user_one, :user_two]

    case Repo.one(conversation_query) do
      nil ->
        {:error, :not_found}

      conversation ->
        # Get messages for this conversation
        messages_query =
          from m in Message,
            where: m.conversation_id == ^conversation_id,
            order_by: [asc: m.inserted_at],
            limit: ^limit,
            offset: ^offset,
            preload: [:sender]

        messages = Repo.all(messages_query)
        other_user = get_other_user(conversation, user_id)

        {:ok, %{conversation: conversation, messages: messages, other_user: other_user}}
    end
  end

  @doc """
  Creates a message in a conversation.
  """
  def create_message(conversation_id, sender_id, content) do
    # Verify the sender is a participant in the conversation
    conversation_query =
      from c in Conversation,
        where: c.id == ^conversation_id,
        where: c.user_one_id == ^sender_id or c.user_two_id == ^sender_id,
        preload: [:user_one, :user_two]

    case Repo.one(conversation_query) do
      nil ->
        {:error, :not_found}

      conversation ->
        %Message{}
        |> Message.changeset(%{
          conversation_id: conversation_id,
          sender_id: sender_id,
          content: content
        })
        |> Repo.insert()
        |> case do
          {:ok, message} ->
            # Update conversation's updated_at timestamp
            conversation
            |> Ecto.Changeset.change(updated_at: DateTime.utc_now())
            |> Repo.update()

            # Check if recipient is a bot and schedule auto-reply
            maybe_schedule_bot_reply(conversation, sender_id)

            {:ok, Repo.preload(message, [:sender])}

          error ->
            error
        end
    end
  end

  # Schedule a bot reply if the recipient is a system bot
  defp maybe_schedule_bot_reply(conversation, sender_id) do
    # Determine the recipient (the other user in the conversation)
    recipient =
      if conversation.user_one_id == sender_id do
        conversation.user_two
      else
        conversation.user_one
      end

    # Only schedule if recipient is a system bot and sender is not a bot
    sender =
      if conversation.user_one_id == sender_id do
        conversation.user_one
      else
        conversation.user_two
      end

    if recipient.is_system_bot && !sender.is_system_bot do
      alias Backend.Engagement.Workers.BotMessageReplyWorker

      BotMessageReplyWorker.schedule_reply(
        conversation.id,
        recipient.id,
        sender_id
      )
    end

    :ok
  end

  @doc """
  Marks all unread messages in a conversation as read for a specific user.
  """
  def mark_messages_as_read(conversation_id, user_id) do
    # Get the conversation to determine who the "other" user is
    conversation_query =
      from c in Conversation,
        where: c.id == ^conversation_id,
        where: c.user_one_id == ^user_id or c.user_two_id == ^user_id

    case Repo.one(conversation_query) do
      nil ->
        {:error, :not_found}

      _conversation ->
        # Mark all messages in this conversation that were NOT sent by user_id and are unread
        query =
          from m in Message,
            where: m.conversation_id == ^conversation_id,
            where: m.sender_id != ^user_id,
            where: is_nil(m.read_at)

        now = DateTime.utc_now()
        {count, _} = Repo.update_all(query, set: [read_at: now])
        {:ok, count}
    end
  end

  @doc """
  Gets the total unread message count for a user across all conversations.
  """
  def get_unread_count(user_id) do
    query =
      from m in Message,
        join: c in Conversation,
        on: m.conversation_id == c.id,
        where: c.user_one_id == ^user_id or c.user_two_id == ^user_id,
        where: m.sender_id != ^user_id,
        where: is_nil(m.read_at),
        select: count(m.id)

    Repo.one(query)
  end

  # Private helper functions

  defp get_last_message(conversation_id) do
    query =
      from m in Message,
        where: m.conversation_id == ^conversation_id,
        order_by: [desc: m.inserted_at],
        limit: 1,
        preload: [:sender]

    Repo.one(query)
  end

  defp get_conversation_unread_count(conversation_id, user_id) do
    query =
      from m in Message,
        where: m.conversation_id == ^conversation_id,
        where: m.sender_id != ^user_id,
        where: is_nil(m.read_at),
        select: count(m.id)

    Repo.one(query)
  end

  defp get_other_user(conversation, user_id) do
    if conversation.user_one_id == user_id do
      conversation.user_two
    else
      conversation.user_one
    end
  end
end
