defmodule Backend.Repo.Migrations.CreateProjectAiTools do
  use Ecto.Migration

  def change do
    create table(:project_ai_tools, primary_key: false) do
      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all),
        null: false

      add :ai_tool_id, references(:ai_tools, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    create unique_index(:project_ai_tools, [:project_id, :ai_tool_id])
    create index(:project_ai_tools, [:ai_tool_id])
  end
end
