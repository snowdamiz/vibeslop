defmodule Backend.Repo.Migrations.CreateConversations do
  use Ecto.Migration

  def change do
    create table(:conversations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      # user_one_id should always be the "lower" UUID to ensure canonical ordering
      add :user_one_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :user_two_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:conversations, [:user_one_id])
    create index(:conversations, [:user_two_id])
    create unique_index(:conversations, [:user_one_id, :user_two_id])

    # Ensure canonical ordering: user_one_id < user_two_id
    create constraint(:conversations, :canonical_user_order, check: "user_one_id < user_two_id")
  end
end
