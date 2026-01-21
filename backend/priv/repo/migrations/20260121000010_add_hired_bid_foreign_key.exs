defmodule Backend.Repo.Migrations.AddHiredBidForeignKey do
  use Ecto.Migration

  def change do
    alter table(:gigs) do
      modify :hired_bid_id, references(:bids, on_delete: :nilify_all, type: :binary_id)
    end
  end
end
