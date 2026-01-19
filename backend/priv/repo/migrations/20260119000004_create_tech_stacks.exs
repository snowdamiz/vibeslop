defmodule Backend.Repo.Migrations.CreateTechStacks do
  use Ecto.Migration

  def change do
    create table(:tech_stacks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :slug, :string, null: false
      add :category, :string

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:tech_stacks, [:name])
    create unique_index(:tech_stacks, [:slug])
  end
end
