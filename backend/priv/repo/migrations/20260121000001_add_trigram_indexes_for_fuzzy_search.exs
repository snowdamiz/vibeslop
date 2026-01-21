defmodule Backend.Repo.Migrations.AddTrigramIndexesForFuzzySearch do
  use Ecto.Migration

  def up do
    # Enable pg_trgm extension for trigram-based fuzzy search
    execute "CREATE EXTENSION IF NOT EXISTS pg_trgm"

    # Add trigram GIN indexes for fuzzy search on text columns
    execute "CREATE INDEX users_username_trgm_idx ON users USING GIN (username gin_trgm_ops)"
    execute "CREATE INDEX users_display_name_trgm_idx ON users USING GIN (display_name gin_trgm_ops)"
    execute "CREATE INDEX projects_title_trgm_idx ON projects USING GIN (title gin_trgm_ops)"
    execute "CREATE INDEX projects_description_trgm_idx ON projects USING GIN (description gin_trgm_ops)"
    execute "CREATE INDEX posts_content_trgm_idx ON posts USING GIN (content gin_trgm_ops)"
  end

  def down do
    # Drop trigram indexes
    execute "DROP INDEX IF EXISTS posts_content_trgm_idx"
    execute "DROP INDEX IF EXISTS projects_description_trgm_idx"
    execute "DROP INDEX IF EXISTS projects_title_trgm_idx"
    execute "DROP INDEX IF EXISTS users_display_name_trgm_idx"
    execute "DROP INDEX IF EXISTS users_username_trgm_idx"

    # Note: We don't drop the extension as other parts of the system might use it
    # execute "DROP EXTENSION IF EXISTS pg_trgm"
  end
end
