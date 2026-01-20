defmodule Backend.Social.Repost do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "reposts" do
    field :repostable_type, :string
    field :repostable_id, :binary_id

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(repost, attrs) do
    repost
    |> cast(attrs, [:repostable_type, :repostable_id, :user_id])
    |> validate_required([:repostable_type, :repostable_id, :user_id])
    |> validate_inclusion(:repostable_type, ["Post", "Project"])
    |> unique_constraint([:user_id, :repostable_type, :repostable_id])
    |> foreign_key_constraint(:user_id)
  end
end
