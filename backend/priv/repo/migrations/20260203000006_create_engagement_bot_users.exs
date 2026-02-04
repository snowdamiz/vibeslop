defmodule Backend.Repo.Migrations.CreateEngagementBotUsers do
  use Ecto.Migration

  def change do
    create table(:engagement_bot_users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :persona_type, :string, null: false
      add :activity_level, :string, null: false
      add :preferred_hours, {:array, :integer}, default: []
      add :active_days, {:array, :integer}, default: []
      add :engagement_style, :map, default: %{}
      add :daily_engagement_limit, :integer, default: 50
      add :engagements_today, :integer, default: 0
      add :last_engaged_at, :utc_datetime
      add :total_engagements, :integer, default: 0
      add :is_active, :boolean, default: true

      timestamps(type: :utc_datetime)
    end

    create unique_index(:engagement_bot_users, [:user_id])
    create index(:engagement_bot_users, [:persona_type])
    create index(:engagement_bot_users, [:is_active])
    create index(:engagement_bot_users, [:activity_level])
  end
end
