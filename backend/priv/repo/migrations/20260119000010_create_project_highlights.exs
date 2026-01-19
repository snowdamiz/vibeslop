defmodule Backend.Repo.Migrations.CreateProjectHighlights do
  use Ecto.Migration

  def change do
    create table(:project_highlights, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all), null: false
      add :content, :string, null: false
      add :position, :integer, default: 0, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:project_highlights, [:project_id])
  end
end
