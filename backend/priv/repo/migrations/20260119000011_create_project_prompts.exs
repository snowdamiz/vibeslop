defmodule Backend.Repo.Migrations.CreateProjectPrompts do
  use Ecto.Migration

  def change do
    create table(:project_prompts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all), null: false
      add :title, :string, null: false
      add :description, :text
      add :code, :text, null: false
      add :position, :integer, default: 0, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:project_prompts, [:project_id])
  end
end
