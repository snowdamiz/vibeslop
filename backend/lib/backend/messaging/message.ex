defmodule Backend.Messaging.Message do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "messages" do
    field :content, :string
    field :read_at, :utc_datetime

    belongs_to :conversation, Backend.Messaging.Conversation
    belongs_to :sender, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(message, attrs) do
    message
    |> cast(attrs, [:conversation_id, :sender_id, :content, :read_at])
    |> validate_required([:conversation_id, :sender_id, :content])
    |> validate_length(:content, min: 1, max: 10_000)
  end
end
