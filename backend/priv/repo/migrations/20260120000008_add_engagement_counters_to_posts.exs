defmodule Backend.Repo.Migrations.AddEngagementCountersToPosts do
  use Ecto.Migration

  def change do
    alter table(:posts) do
      add :likes_count, :integer, default: 0, null: false
      add :comments_count, :integer, default: 0, null: false
      add :reposts_count, :integer, default: 0, null: false
      add :bookmarks_count, :integer, default: 0, null: false
      add :quotes_count, :integer, default: 0, null: false
    end

    # Index for algorithmic sorting
    create index(:posts, [:likes_count])
    create index(:posts, [:impression_count])
    create index(:posts, [:reposts_count])
    create index(:posts, [:comments_count])
  end
end
