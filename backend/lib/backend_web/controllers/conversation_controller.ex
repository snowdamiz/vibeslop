defmodule BackendWeb.ConversationController do
  use BackendWeb, :controller

  alias Backend.Messaging
  alias Backend.Accounts

  action_fallback BackendWeb.FallbackController

  @doc """
  List all conversations for the current user.
  """
  def index(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))

    conversations = Messaging.list_conversations(current_user.id, limit: limit, offset: offset)

    render(conn, :index, conversations: conversations, current_user_id: current_user.id)
  end

  @doc """
  Get a single conversation with messages.
  """
  def show(conn, %{"id" => id} = params) do
    current_user = conn.assigns[:current_user]
    limit = String.to_integer(Map.get(params, "limit", "50"))
    offset = String.to_integer(Map.get(params, "offset", "0"))

    case Messaging.get_conversation_with_messages(id, current_user.id, limit: limit, offset: offset) do
      {:ok, data} ->
        render(conn, :show,
          conversation: data.conversation,
          messages: data.messages,
          other_user: data.other_user,
          current_user_id: current_user.id
        )

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")
    end
  end

  @doc """
  Create a new conversation with another user (or return existing one).
  """
  def create(conn, %{"username" => username}) do
    current_user = conn.assigns[:current_user]

    # Find the other user by username
    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "User not found"})

      other_user ->
        if other_user.id == current_user.id do
          conn
          |> put_status(:bad_request)
          |> json(%{error: "Cannot create conversation with yourself"})
        else
          case Messaging.get_or_create_conversation(current_user.id, other_user.id) do
            {:ok, conversation} ->
              other_user_data = if conversation.user_one_id == current_user.id do
                conversation.user_two
              else
                conversation.user_one
              end

              render(conn, :created,
                conversation: conversation,
                other_user: other_user_data,
                current_user_id: current_user.id
              )

            {:error, changeset} ->
              conn
              |> put_status(:unprocessable_entity)
              |> put_view(json: BackendWeb.ChangesetJSON)
              |> render(:error, changeset: changeset)
          end
        end
    end
  end

  @doc """
  Send a message in a conversation.
  """
  def create_message(conn, %{"id" => conversation_id, "content" => content}) do
    current_user = conn.assigns[:current_user]

    case Messaging.create_message(conversation_id, current_user.id, content) do
      {:ok, message} ->
        render(conn, :message, message: message, current_user_id: current_user.id)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Conversation not found or you are not a participant"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  @doc """
  Mark all messages in a conversation as read.
  """
  def mark_read(conn, %{"id" => conversation_id}) do
    current_user = conn.assigns[:current_user]

    case Messaging.mark_messages_as_read(conversation_id, current_user.id) do
      {:ok, count} ->
        json(conn, %{success: true, marked_read_count: count})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Conversation not found"})
    end
  end
end
