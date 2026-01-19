defmodule Backend.Repo.Migrations.CreateNotifications do
  use Ecto.Migration

  def change do
    create table(:notifications, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :actor_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :type, :string, null: false
      add :target_type, :string
      add :target_id, :binary_id
      add :content_preview, :string
      add :read, :boolean, default: false, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:notifications, [:user_id])
    create index(:notifications, [:user_id, :read])
    create index(:notifications, [:actor_id])
    create index(:notifications, [:inserted_at])
  end
end
