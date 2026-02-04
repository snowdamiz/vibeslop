defmodule Backend.Content.Project do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "projects" do
    field :title, :string
    field :description, :string
    field :long_description, :string
    field :status, :string, default: "draft"
    field :live_url, :string
    field :github_url, :string
    field :view_count, :integer, default: 0
    field :published_at, :utc_datetime
    field :likes_count, :integer, default: 0
    field :comments_count, :integer, default: 0
    field :reposts_count, :integer, default: 0
    field :bookmarks_count, :integer, default: 0
    field :quotes_count, :integer, default: 0
    field :engagement_score, :float, default: 0.0

    belongs_to :user, Backend.Accounts.User

    many_to_many :ai_tools, Backend.Catalog.AiTool,
      join_through: "project_ai_tools",
      on_replace: :delete

    many_to_many :tech_stacks, Backend.Catalog.TechStack,
      join_through: "project_tech_stacks",
      on_replace: :delete

    has_many :images, Backend.Content.ProjectImage
    has_many :highlights, Backend.Content.ProjectHighlight
    has_many :timeline_entries, Backend.Content.ProjectTimelineEntry

    has_many :likes, Backend.Social.Like,
      where: [likeable_type: "Project"],
      foreign_key: :likeable_id

    has_many :comments, Backend.Content.Comment,
      where: [commentable_type: "Project"],
      foreign_key: :commentable_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(project, attrs) do
    project
    |> cast(attrs, [
      :title,
      :description,
      :long_description,
      :status,
      :live_url,
      :github_url,
      :user_id,
      :published_at
    ])
    |> validate_required([:title, :description, :user_id])
    |> validate_length(:title, min: 3, max: 200)
    |> validate_length(:description, min: 1, max: 5000)
    |> validate_inclusion(:status, ["draft", "published", "archived"])
    |> foreign_key_constraint(:user_id)
  end
end
