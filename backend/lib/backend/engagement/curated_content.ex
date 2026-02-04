defmodule Backend.Engagement.CuratedContent do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @content_types ~w(Post Project)

  schema "curated_content" do
    field :content_type, :string
    field :content_id, :binary_id
    field :priority, :integer, default: 3
    field :engagement_multiplier, :float, default: 1.5
    field :expires_at, :utc_datetime
    field :is_active, :boolean, default: true

    belongs_to :added_by, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(curated_content, attrs) do
    curated_content
    |> cast(attrs, [
      :content_type,
      :content_id,
      :priority,
      :engagement_multiplier,
      :added_by_id,
      :expires_at,
      :is_active
    ])
    |> validate_required([:content_type, :content_id])
    |> validate_inclusion(:content_type, @content_types)
    |> validate_number(:priority, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_number(:engagement_multiplier, greater_than: 0, less_than_or_equal_to: 5)
    |> unique_constraint([:content_type, :content_id])
  end
end
