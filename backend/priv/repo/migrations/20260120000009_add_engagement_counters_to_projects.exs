defmodule Backend.Repo.Migrations.AddEngagementCountersToProjects do
  use Ecto.Migration

  def change do
    alter table(:projects) do
      add :likes_count, :integer, default: 0, null: false
      add :comments_count, :integer, default: 0, null: false
      add :reposts_count, :integer, default: 0, null: false
      add :bookmarks_count, :integer, default: 0, null: false
      add :quotes_count, :integer, default: 0, null: false
      # Note: view_count already exists (used for impressions)
    end

    # Index for algorithmic sorting
    create index(:projects, [:likes_count])
    create index(:projects, [:view_count])
    create index(:projects, [:reposts_count])
    create index(:projects, [:comments_count])
  end
end
