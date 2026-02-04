defmodule Backend.Repo.Migrations.CreateSimulatedEngagementLog do
  use Ecto.Migration

  def change do
    create table(:simulated_engagement_log, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :bot_user_id, references(:engagement_bot_users, type: :binary_id, on_delete: :delete_all), null: false
      add :engagement_type, :string, null: false
      add :target_type, :string, null: false
      add :target_id, :binary_id, null: false
      add :scheduled_for, :utc_datetime, null: false
      add :executed_at, :utc_datetime
      add :status, :string, default: "pending"
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime)
    end

    create index(:simulated_engagement_log, [:bot_user_id])
    create index(:simulated_engagement_log, [:status])
    create index(:simulated_engagement_log, [:scheduled_for])
    create index(:simulated_engagement_log, [:target_type, :target_id])
    create index(:simulated_engagement_log, [:engagement_type])
  end
end
