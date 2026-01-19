defmodule Backend.Social.Like do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "likes" do
    field :likeable_type, :string
    field :likeable_id, :binary_id

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(like, attrs) do
    like
    |> cast(attrs, [:likeable_type, :likeable_id, :user_id])
    |> validate_required([:likeable_type, :likeable_id, :user_id])
    |> validate_inclusion(:likeable_type, ["Post", "Project", "Comment"])
    |> unique_constraint([:user_id, :likeable_type, :likeable_id])
    |> foreign_key_constraint(:user_id)
  end
end
