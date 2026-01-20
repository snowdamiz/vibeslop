defmodule Backend.Repo.Migrations.CreateReports do
  use Ecto.Migration

  def change do
    create table(:reports, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :reportable_type, :string, null: false
      add :reportable_id, :binary_id, null: false
      add :status, :string, default: "pending", null: false
      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:reports, [:user_id])
    create index(:reports, [:reportable_type, :reportable_id])
    create index(:reports, [:status])
    create unique_index(:reports, [:user_id, :reportable_type, :reportable_id])
  end
end
