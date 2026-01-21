defmodule Backend.Repo.Migrations.CreateImpressions do
  use Ecto.Migration

  def change do
    create table(:impressions, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :impressionable_type, :string, null: false
      add :impressionable_id, :binary_id, null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all)
      add :fingerprint, :string
      add :ip_address, :string

      timestamps(type: :utc_datetime, updated_at: false)
    end

    # Composite unique index to prevent duplicate impressions
    # For authenticated users: user_id + impressionable combo must be unique
    create unique_index(:impressions, [:user_id, :impressionable_type, :impressionable_id],
             where: "user_id IS NOT NULL",
             name: :impressions_user_unique_index
           )

    # For anonymous users: fingerprint + impressionable combo must be unique
    create unique_index(:impressions, [:fingerprint, :impressionable_type, :impressionable_id],
             where: "fingerprint IS NOT NULL AND user_id IS NULL",
             name: :impressions_fingerprint_unique_index
           )

    # Index for querying impressions by impressionable
    create index(:impressions, [:impressionable_type, :impressionable_id])
  end
end
