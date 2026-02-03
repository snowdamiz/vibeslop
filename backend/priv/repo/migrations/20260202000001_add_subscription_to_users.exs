defmodule Backend.Repo.Migrations.AddSubscriptionToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :stripe_customer_id, :string
      add :subscription_status, :string, default: "free"
      add :subscription_stripe_id, :string
      add :subscription_current_period_end, :utc_datetime
    end

    create index(:users, [:stripe_customer_id], unique: true)
    create index(:users, [:subscription_status])
  end
end
