defmodule Backend.Repo.Migrations.CreateBookmarks do
  use Ecto.Migration

  def change do
    create table(:bookmarks, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :bookmarkable_type, :string, null: false
      add :bookmarkable_id, :binary_id, null: false

      timestamps(type: :utc_datetime, updated_at: false)
    end

    create index(:bookmarks, [:user_id])
    create index(:bookmarks, [:bookmarkable_type, :bookmarkable_id])
    create unique_index(:bookmarks, [:user_id, :bookmarkable_type, :bookmarkable_id])
  end
end
