defmodule Backend.Content.Post do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "posts" do
    field :content, :string

    belongs_to :user, Backend.Accounts.User
    belongs_to :linked_project, Backend.Content.Project

    has_many :likes, Backend.Social.Like, where: [likeable_type: "Post"], foreign_key: :likeable_id
    has_many :comments, Backend.Content.Comment, where: [commentable_type: "Post"], foreign_key: :commentable_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(post, attrs) do
    post
    |> cast(attrs, [:content, :user_id, :linked_project_id])
    |> validate_required([:content, :user_id])
    |> validate_length(:content, min: 1, max: 5000)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:linked_project_id)
  end
end
