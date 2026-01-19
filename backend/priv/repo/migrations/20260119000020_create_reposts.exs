defmodule Backend.Repo.Migrations.CreateReposts do
  use Ecto.Migration

  def change do
    create table(:reposts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :repostable_type, :string, null: false
      add :repostable_id, :binary_id, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:reposts, [:user_id])
    create index(:reposts, [:repostable_type, :repostable_id])
    create unique_index(:reposts, [:user_id, :repostable_type, :repostable_id])
  end
end
