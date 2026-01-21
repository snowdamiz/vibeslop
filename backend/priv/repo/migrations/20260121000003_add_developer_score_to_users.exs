defmodule Backend.Repo.Migrations.AddDeveloperScoreToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      # Unbounded cumulative developer score (starts at 0)
      add :developer_score, :integer, default: 0
      # Timestamp of last score calculation
      add :developer_score_updated_at, :utc_datetime
      # Raw GitHub stats and score breakdown for transparency
      add :github_stats, :map
    end

    # Index for leaderboard queries (ordering by score)
    create index(:users, [:developer_score], where: "developer_score > 0")
  end
end
