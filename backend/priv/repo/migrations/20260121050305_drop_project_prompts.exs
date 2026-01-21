defmodule Backend.Repo.Migrations.DropProjectPrompts do
  use Ecto.Migration

  def change do
    drop index(:project_prompts, [:project_id])
    drop table(:project_prompts)
  end
end
