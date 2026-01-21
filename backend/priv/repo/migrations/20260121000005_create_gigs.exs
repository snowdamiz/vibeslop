defmodule Backend.Repo.Migrations.CreateGigs do
  use Ecto.Migration

  def change do
    create table(:gigs, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :description, :text, null: false
      add :budget_min, :integer
      add :budget_max, :integer
      add :currency, :string, default: "USD", null: false
      add :deadline, :date
      add :status, :string, default: "open", null: false
      add :bids_count, :integer, default: 0, null: false
      add :views_count, :integer, default: 0, null: false

      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false
      add :hired_bid_id, :binary_id

      timestamps(type: :utc_datetime)
    end

    create index(:gigs, [:user_id])
    create index(:gigs, [:status])
    create index(:gigs, [:inserted_at])
    create index(:gigs, [:hired_bid_id])
  end
end
