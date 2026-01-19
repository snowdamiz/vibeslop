defmodule Backend.Social.Follow do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "follows" do
    belongs_to :follower, Backend.Accounts.User
    belongs_to :following, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(follow, attrs) do
    follow
    |> cast(attrs, [:follower_id, :following_id])
    |> validate_required([:follower_id, :following_id])
    |> unique_constraint([:follower_id, :following_id])
    |> check_constraint(:follower_id, name: :cannot_follow_self, message: "cannot follow yourself")
    |> foreign_key_constraint(:follower_id)
    |> foreign_key_constraint(:following_id)
  end
end
