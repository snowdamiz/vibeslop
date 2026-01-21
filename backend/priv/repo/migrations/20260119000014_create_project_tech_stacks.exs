defmodule Backend.Repo.Migrations.CreateProjectTechStacks do
  use Ecto.Migration

  def change do
    create table(:project_tech_stacks, primary_key: false) do
      add :project_id, references(:projects, type: :binary_id, on_delete: :delete_all),
        null: false

      add :tech_stack_id, references(:tech_stacks, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    create unique_index(:project_tech_stacks, [:project_id, :tech_stack_id])
    create index(:project_tech_stacks, [:tech_stack_id])
  end
end
