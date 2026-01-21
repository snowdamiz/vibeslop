defmodule Backend.Repo.Migrations.CreateProjectImages do
  use Ecto.Migration

  def change do
    create table(:project_images, primary_key: false) do
      add :id, :binary_id, primary_key: true

      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all),
        null: false

      add :url, :string, null: false
      add :alt_text, :string
      add :position, :integer, default: 0, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:project_images, [:project_id])
  end
end
