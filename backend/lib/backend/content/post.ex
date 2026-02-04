defmodule Backend.Content.Post do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "posts" do
    field :content, :string
    field :impression_count, :integer, default: 0
    field :likes_count, :integer, default: 0
    field :comments_count, :integer, default: 0
    field :reposts_count, :integer, default: 0
    field :bookmarks_count, :integer, default: 0
    field :quotes_count, :integer, default: 0
    field :engagement_score, :float, default: 0.0

    belongs_to :user, Backend.Accounts.User
    belongs_to :linked_project, Backend.Content.Project
    belongs_to :quoted_post, Backend.Content.Post
    belongs_to :quoted_project, Backend.Content.Project

    has_many :likes, Backend.Social.Like,
      where: [likeable_type: "Post"],
      foreign_key: :likeable_id

    has_many :comments, Backend.Content.Comment,
      where: [commentable_type: "Post"],
      foreign_key: :commentable_id

    has_many :media, Backend.Content.PostMedia

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(post, attrs) do
    post
    |> cast(attrs, [:content, :user_id, :linked_project_id, :quoted_post_id, :quoted_project_id])
    |> validate_required([:user_id])
    |> validate_length(:content, max: 5000)
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:linked_project_id)
    |> foreign_key_constraint(:quoted_post_id)
    |> foreign_key_constraint(:quoted_project_id)
  end

  @doc """
  Changeset for posts that may have media attachments.
  Either content or media must be present.
  """
  def changeset_with_media(post, attrs, has_media?) do
    changeset = changeset(post, attrs)

    content = get_field(changeset, :content)

    if (is_nil(content) or content == "") and not has_media? do
      add_error(changeset, :content, "either content or media must be present")
    else
      changeset
    end
  end
end
