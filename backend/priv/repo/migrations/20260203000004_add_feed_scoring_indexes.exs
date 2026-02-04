defmodule Backend.Repo.Migrations.AddFeedScoringIndexes do
  use Ecto.Migration

  @moduledoc """
  Adds indexes to optimize feed scoring queries.

  Note: PostgreSQL doesn't allow NOW() in partial index predicates (not IMMUTABLE),
  so we use regular indexes. The query planner will still benefit from these indexes
  when filtering by date range.
  """

  def up do
    # Index for posts scoring - ordered by insertion date (desc) for feed queries
    execute """
    CREATE INDEX IF NOT EXISTS posts_inserted_at_desc_idx ON posts (inserted_at DESC)
    """

    # Composite index for posts engagement scoring
    execute """
    CREATE INDEX IF NOT EXISTS posts_engagement_idx ON posts (
      likes_count,
      comments_count,
      reposts_count,
      bookmarks_count,
      quotes_count
    )
    """

    # Index for projects scoring - partial index for published projects
    execute """
    CREATE INDEX IF NOT EXISTS projects_published_at_desc_idx ON projects (published_at DESC)
    WHERE status = 'published'
    """

    # Composite index for projects engagement scoring
    execute """
    CREATE INDEX IF NOT EXISTS projects_engagement_idx ON projects (
      likes_count,
      comments_count,
      reposts_count,
      bookmarks_count,
      quotes_count
    ) WHERE status = 'published'
    """

    # Index for gigs scoring - partial index for open gigs only
    execute """
    CREATE INDEX IF NOT EXISTS gigs_inserted_at_desc_idx ON gigs (inserted_at DESC)
    WHERE status = 'open'
    """

    # Composite index for gigs engagement scoring
    execute """
    CREATE INDEX IF NOT EXISTS gigs_engagement_idx ON gigs (
      bids_count,
      views_count
    ) WHERE status = 'open'
    """

    # Index to optimize self-engagement lookups
    execute """
    CREATE INDEX IF NOT EXISTS likes_user_content_idx ON likes (user_id, likeable_type, likeable_id)
    """

    execute """
    CREATE INDEX IF NOT EXISTS reposts_user_content_idx ON reposts (user_id, repostable_type, repostable_id)
    """

    execute """
    CREATE INDEX IF NOT EXISTS bookmarks_user_content_idx ON bookmarks (user_id, bookmarkable_type, bookmarkable_id)
    """
  end

  def down do
    execute "DROP INDEX IF EXISTS posts_inserted_at_desc_idx"
    execute "DROP INDEX IF EXISTS posts_engagement_idx"
    execute "DROP INDEX IF EXISTS projects_published_at_desc_idx"
    execute "DROP INDEX IF EXISTS projects_engagement_idx"
    execute "DROP INDEX IF EXISTS gigs_inserted_at_desc_idx"
    execute "DROP INDEX IF EXISTS gigs_engagement_idx"
    execute "DROP INDEX IF EXISTS likes_user_content_idx"
    execute "DROP INDEX IF EXISTS reposts_user_content_idx"
    execute "DROP INDEX IF EXISTS bookmarks_user_content_idx"
  end
end
