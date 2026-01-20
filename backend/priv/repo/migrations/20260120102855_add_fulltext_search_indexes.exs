defmodule Backend.Repo.Migrations.AddFulltextSearchIndexes do
  use Ecto.Migration

  def up do
    # Add tsvector columns for full-text search
    alter table(:posts) do
      add :search_vector, :tsvector
    end

    alter table(:projects) do
      add :search_vector, :tsvector
    end

    alter table(:users) do
      add :search_vector, :tsvector
    end

    # Create GIN indexes for fast full-text search
    execute "CREATE INDEX posts_search_vector_idx ON posts USING GIN (search_vector)"
    execute "CREATE INDEX projects_search_vector_idx ON projects USING GIN (search_vector)"
    execute "CREATE INDEX users_search_vector_idx ON users USING GIN (search_vector)"

    # Create triggers to automatically update tsvector columns
    # Posts: index content field
    execute """
    CREATE FUNCTION posts_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'A');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER posts_search_vector_trigger
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION posts_search_vector_update();
    """

    # Projects: index title (weight A) and description (weight B)
    execute """
    CREATE FUNCTION projects_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER projects_search_vector_trigger
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION projects_search_vector_update();
    """

    # Users: index username (weight A) and display_name (weight A) and bio (weight B)
    execute """
    CREATE FUNCTION users_search_vector_update() RETURNS trigger AS $$
    BEGIN
      NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.username, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.display_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.bio, '')), 'B');
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER users_search_vector_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION users_search_vector_update();
    """

    # Update existing rows to populate search_vector
    execute "UPDATE posts SET search_vector = to_tsvector('english', COALESCE(content, ''))"
    execute "UPDATE projects SET search_vector = setweight(to_tsvector('english', COALESCE(title, '')), 'A') || setweight(to_tsvector('english', COALESCE(description, '')), 'B')"
    execute "UPDATE users SET search_vector = setweight(to_tsvector('english', COALESCE(username, '')), 'A') || setweight(to_tsvector('english', COALESCE(display_name, '')), 'A') || setweight(to_tsvector('english', COALESCE(bio, '')), 'B')"
  end

  def down do
    # Drop triggers
    execute "DROP TRIGGER IF EXISTS posts_search_vector_trigger ON posts"
    execute "DROP FUNCTION IF EXISTS posts_search_vector_update()"

    execute "DROP TRIGGER IF EXISTS projects_search_vector_trigger ON projects"
    execute "DROP FUNCTION IF EXISTS projects_search_vector_update()"

    execute "DROP TRIGGER IF EXISTS users_search_vector_trigger ON users"
    execute "DROP FUNCTION IF EXISTS users_search_vector_update()"

    # Drop indexes
    execute "DROP INDEX IF EXISTS posts_search_vector_idx"
    execute "DROP INDEX IF EXISTS projects_search_vector_idx"
    execute "DROP INDEX IF EXISTS users_search_vector_idx"

    # Remove columns
    alter table(:posts) do
      remove :search_vector
    end

    alter table(:projects) do
      remove :search_vector
    end

    alter table(:users) do
      remove :search_vector
    end
  end
end
