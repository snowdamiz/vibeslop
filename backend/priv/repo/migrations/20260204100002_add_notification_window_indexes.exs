defmodule Backend.Repo.Migrations.AddNotificationWindowIndexes do
  use Ecto.Migration

  @moduledoc """
  Adds indexes optimized for the window function-based grouped notifications query.

  The grouped notifications query uses:
  - Window partitioning by (type, target_type, target_id)
  - Ordering by inserted_at DESC within each partition
  - Filtering by user_id and type IN ('like', 'repost', 'bookmark', 'quote')

  These indexes help PostgreSQL efficiently:
  1. Filter by user_id
  2. Filter by groupable types
  3. Order within partitions
  """

  def up do
    # Composite index for grouped notifications window query
    # Covers: WHERE user_id = ? AND type IN (...) AND target_id IS NOT NULL
    # Plus efficient access for PARTITION BY and ORDER BY
    execute """
    CREATE INDEX IF NOT EXISTS notifications_grouped_window_idx
    ON notifications (user_id, type, target_type, target_id, inserted_at DESC)
    WHERE target_id IS NOT NULL
    """

    # Partial index for non-grouped notification types (comments, mentions, follows, etc.)
    # These types are not aggregated, so we just need efficient user + time ordering
    execute """
    CREATE INDEX IF NOT EXISTS notifications_non_grouped_idx
    ON notifications (user_id, inserted_at DESC)
    WHERE type NOT IN ('like', 'repost', 'bookmark', 'quote')
    """

    # Index for efficient actor joins in grouped query
    # The join: actor in assoc(n, :actor) benefits from this
    execute """
    CREATE INDEX IF NOT EXISTS notifications_actor_lookup_idx
    ON notifications (actor_id)
    """
  end

  def down do
    execute "DROP INDEX IF EXISTS notifications_grouped_window_idx"
    execute "DROP INDEX IF EXISTS notifications_non_grouped_idx"
    execute "DROP INDEX IF EXISTS notifications_actor_lookup_idx"
  end
end
