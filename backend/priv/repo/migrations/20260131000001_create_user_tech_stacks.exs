defmodule Backend.Repo.Migrations.CreateUserTechStacks do
  use Ecto.Migration

  def change do
    create table(:user_tech_stacks, primary_key: false) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :tech_stack_id, references(:tech_stacks, type: :binary_id, on_delete: :delete_all),
        null: false
    end

    create unique_index(:user_tech_stacks, [:user_id, :tech_stack_id])
    create index(:user_tech_stacks, [:tech_stack_id])
  end
end
