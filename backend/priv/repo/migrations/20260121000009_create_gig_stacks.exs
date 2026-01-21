defmodule Backend.Repo.Migrations.CreateGigStacks do
  use Ecto.Migration

  def change do
    create table(:gig_tech_stacks, primary_key: false) do
      add :gig_id, references(:gigs, on_delete: :delete_all, type: :binary_id), null: false

      add :tech_stack_id, references(:tech_stacks, on_delete: :delete_all, type: :binary_id),
        null: false
    end

    create index(:gig_tech_stacks, [:gig_id])
    create index(:gig_tech_stacks, [:tech_stack_id])
    create unique_index(:gig_tech_stacks, [:gig_id, :tech_stack_id])
  end
end
