defmodule Backend.Repo.Migrations.CreateSpecializations do
  use Ecto.Migration

  def change do
    create table(:specializations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :slug, :string, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:specializations, [:name])
    create unique_index(:specializations, [:slug])
  end
end
