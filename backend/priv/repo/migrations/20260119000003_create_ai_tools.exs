defmodule Backend.Repo.Migrations.CreateAiTools do
  use Ecto.Migration

  def change do
    create table(:ai_tools, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :name, :string, null: false
      add :slug, :string, null: false
      add :icon_url, :string

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create unique_index(:ai_tools, [:name])
    create unique_index(:ai_tools, [:slug])
  end
end
