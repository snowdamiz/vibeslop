defmodule Backend.Social.Bookmark do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "bookmarks" do
    field :bookmarkable_type, :string
    field :bookmarkable_id, :binary_id

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(bookmark, attrs) do
    bookmark
    |> cast(attrs, [:bookmarkable_type, :bookmarkable_id, :user_id])
    |> validate_required([:bookmarkable_type, :bookmarkable_id, :user_id])
    |> validate_inclusion(:bookmarkable_type, ["Post", "Project", "Comment"])
    |> unique_constraint([:user_id, :bookmarkable_type, :bookmarkable_id])
    |> foreign_key_constraint(:user_id)
  end
end
