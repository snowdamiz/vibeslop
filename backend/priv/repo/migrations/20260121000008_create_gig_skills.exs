defmodule Backend.Repo.Migrations.CreateGigSkills do
  use Ecto.Migration

  def change do
    create table(:gig_ai_tools, primary_key: false) do
      add :gig_id, references(:gigs, on_delete: :delete_all, type: :binary_id), null: false

      add :ai_tool_id, references(:ai_tools, on_delete: :delete_all, type: :binary_id),
        null: false
    end

    create index(:gig_ai_tools, [:gig_id])
    create index(:gig_ai_tools, [:ai_tool_id])
    create unique_index(:gig_ai_tools, [:gig_id, :ai_tool_id])
  end
end
