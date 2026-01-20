defmodule Backend.Social.EngagementHourly do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "engagement_hourly" do
    field :content_type, :string
    field :content_id, :binary_id
    field :hour_bucket, :utc_datetime

    field :likes, :integer, default: 0
    field :comments, :integer, default: 0
    field :reposts, :integer, default: 0
    field :bookmarks, :integer, default: 0
    field :quotes, :integer, default: 0
    field :impressions, :integer, default: 0

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(engagement_hourly, attrs) do
    engagement_hourly
    |> cast(attrs, [
      :content_type,
      :content_id,
      :hour_bucket,
      :likes,
      :comments,
      :reposts,
      :bookmarks,
      :quotes,
      :impressions
    ])
    |> validate_required([:content_type, :content_id, :hour_bucket])
    |> validate_inclusion(:content_type, ["Post", "Project"])
    |> unique_constraint([:content_type, :content_id, :hour_bucket])
  end
end
