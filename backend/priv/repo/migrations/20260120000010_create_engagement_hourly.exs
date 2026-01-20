defmodule Backend.Repo.Migrations.CreateEngagementHourly do
  use Ecto.Migration

  def change do
    create table(:engagement_hourly, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :content_type, :string, null: false
      add :content_id, :binary_id, null: false
      add :hour_bucket, :utc_datetime, null: false

      add :likes, :integer, default: 0, null: false
      add :comments, :integer, default: 0, null: false
      add :reposts, :integer, default: 0, null: false
      add :bookmarks, :integer, default: 0, null: false
      add :quotes, :integer, default: 0, null: false
      add :impressions, :integer, default: 0, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:engagement_hourly, [:content_type, :content_id, :hour_bucket])
    create index(:engagement_hourly, [:hour_bucket])
    create index(:engagement_hourly, [:content_type, :hour_bucket])
  end
end
