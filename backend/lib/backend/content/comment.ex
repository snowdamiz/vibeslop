defmodule Backend.Content.Comment do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "comments" do
    field :content, :string
    field :commentable_type, :string
    field :commentable_id, :binary_id

    belongs_to :user, Backend.Accounts.User
    belongs_to :parent, Backend.Content.Comment

    has_many :replies, Backend.Content.Comment, foreign_key: :parent_id
    has_many :likes, Backend.Social.Like, where: [likeable_type: "Comment"], foreign_key: :likeable_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(comment, attrs) do
    comment
    |> cast(attrs, [:content, :commentable_type, :commentable_id, :user_id, :parent_id])
    |> validate_required([:content, :commentable_type, :commentable_id, :user_id])
    |> validate_length(:content, min: 1, max: 2000)
    |> validate_inclusion(:commentable_type, ["Post", "Project"])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:parent_id)
  end
end
