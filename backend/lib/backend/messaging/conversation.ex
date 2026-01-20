defmodule Backend.Messaging.Conversation do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "conversations" do
    belongs_to :user_one, Backend.Accounts.User
    belongs_to :user_two, Backend.Accounts.User
    has_many :messages, Backend.Messaging.Message

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(conversation, attrs) do
    conversation
    |> cast(attrs, [:user_one_id, :user_two_id])
    |> validate_required([:user_one_id, :user_two_id])
    |> validate_different_users()
    |> ensure_canonical_order()
    |> unique_constraint([:user_one_id, :user_two_id])
  end

  defp validate_different_users(changeset) do
    user_one_id = get_field(changeset, :user_one_id)
    user_two_id = get_field(changeset, :user_two_id)

    if user_one_id && user_two_id && user_one_id == user_two_id do
      add_error(changeset, :user_two_id, "cannot create conversation with yourself")
    else
      changeset
    end
  end

  defp ensure_canonical_order(changeset) do
    user_one_id = get_field(changeset, :user_one_id)
    user_two_id = get_field(changeset, :user_two_id)

    if user_one_id && user_two_id && user_one_id > user_two_id do
      changeset
      |> put_change(:user_one_id, user_two_id)
      |> put_change(:user_two_id, user_one_id)
    else
      changeset
    end
  end
end
