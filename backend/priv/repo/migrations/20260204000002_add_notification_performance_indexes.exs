defmodule Backend.Repo.Migrations.AddNotificationPerformanceIndexes do
  use Ecto.Migration

  @moduledoc """
  Adds indexes to optimize notification queries for grouped notifications feature.
  """

  def up do
    # Index for grouped notifications batch query - covers WHERE user_id AND type IN AND target_id IN
    execute """
    CREATE INDEX IF NOT EXISTS notifications_user_type_target_idx
    ON notifications (user_id, type, target_id)
    """

    # Index for listing notifications by user ordered by time
    execute """
    CREATE INDEX IF NOT EXISTS notifications_user_inserted_at_idx
    ON notifications (user_id, inserted_at DESC)
    """

    # Index for counting unread notifications
    execute """
    CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON notifications (user_id)
    WHERE read = false
    """
  end

  def down do
    execute "DROP INDEX IF EXISTS notifications_user_type_target_idx"
    execute "DROP INDEX IF EXISTS notifications_user_inserted_at_idx"
    execute "DROP INDEX IF EXISTS notifications_user_unread_idx"
  end
end
