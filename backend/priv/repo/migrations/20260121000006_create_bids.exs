defmodule Backend.Repo.Migrations.CreateBids do
  use Ecto.Migration

  def change do
    create table(:bids, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :amount, :integer, null: false
      add :currency, :string, default: "USD", null: false
      add :delivery_days, :integer, null: false
      add :proposal, :text, null: false
      add :status, :string, default: "pending", null: false

      add :gig_id, references(:gigs, on_delete: :delete_all, type: :binary_id), null: false
      add :user_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:bids, [:gig_id])
    create index(:bids, [:user_id])
    create index(:bids, [:status])
    create unique_index(:bids, [:gig_id, :user_id], name: :bids_gig_user_unique_index)
  end
end
