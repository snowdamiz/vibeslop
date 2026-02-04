defmodule Backend.Repo.Migrations.AddEngagementScoreColumns do
  use Ecto.Migration

  @moduledoc """
  Adds precomputed engagement_score columns to posts, projects, and gigs.

  This optimization moves the expensive engagement score calculation from query time
  to write time (when engagement happens). The feed query then only needs to apply
  time decay to the precomputed score, which is much faster.

  Score formula: likes*1 + comments*10 + reposts*5 + bookmarks*4 + quotes*8
  Time decay is still applied at query time since it depends on NOW().
  """

  def up do
    # Add engagement_score column to posts
    alter table(:posts) do
      add :engagement_score, :float, default: 0.0, null: false
    end

    # Add engagement_score column to projects
    alter table(:projects) do
      add :engagement_score, :float, default: 0.0, null: false
    end

    # Add engagement_score column to gigs (uses different formula)
    alter table(:gigs) do
      add :engagement_score, :float, default: 0.0, null: false
    end

    # Create indexes for fast sorting by engagement score
    create index(:posts, [:engagement_score], name: :posts_engagement_score_idx)
    create index(:projects, [:engagement_score],
      where: "status = 'published'",
      name: :projects_engagement_score_idx
    )
    create index(:gigs, [:engagement_score],
      where: "status = 'open'",
      name: :gigs_engagement_score_idx
    )

    # Create composite indexes for feed queries (engagement_score + inserted_at)
    create index(:posts, [:engagement_score, :inserted_at],
      name: :posts_feed_score_idx
    )
    create index(:projects, [:engagement_score, :published_at],
      where: "status = 'published'",
      name: :projects_feed_score_idx
    )
    create index(:gigs, [:engagement_score, :inserted_at],
      where: "status = 'open'",
      name: :gigs_feed_score_idx
    )

    # Backfill engagement scores for existing posts
    execute """
    UPDATE posts SET engagement_score =
      COALESCE(likes_count, 0) * 1.0 +
      COALESCE(comments_count, 0) * 10.0 +
      COALESCE(reposts_count, 0) * 5.0 +
      COALESCE(bookmarks_count, 0) * 4.0 +
      COALESCE(quotes_count, 0) * 8.0
    """

    # Backfill engagement scores for existing projects
    execute """
    UPDATE projects SET engagement_score =
      COALESCE(likes_count, 0) * 1.0 +
      COALESCE(comments_count, 0) * 10.0 +
      COALESCE(reposts_count, 0) * 5.0 +
      COALESCE(bookmarks_count, 0) * 4.0 +
      COALESCE(quotes_count, 0) * 8.0
    """

    # Backfill engagement scores for existing gigs (different formula)
    execute """
    UPDATE gigs SET engagement_score =
      COALESCE(bids_count, 0) * 15.0 +
      COALESCE(views_count, 0) * 0.5
    """

    # Create trigger function to auto-update engagement_score on posts
    execute """
    CREATE OR REPLACE FUNCTION update_post_engagement_score()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.engagement_score :=
        COALESCE(NEW.likes_count, 0) * 1.0 +
        COALESCE(NEW.comments_count, 0) * 10.0 +
        COALESCE(NEW.reposts_count, 0) * 5.0 +
        COALESCE(NEW.bookmarks_count, 0) * 4.0 +
        COALESCE(NEW.quotes_count, 0) * 8.0;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER posts_engagement_score_trigger
    BEFORE INSERT OR UPDATE OF likes_count, comments_count, reposts_count, bookmarks_count, quotes_count
    ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_post_engagement_score();
    """

    # Create trigger function to auto-update engagement_score on projects
    execute """
    CREATE OR REPLACE FUNCTION update_project_engagement_score()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.engagement_score :=
        COALESCE(NEW.likes_count, 0) * 1.0 +
        COALESCE(NEW.comments_count, 0) * 10.0 +
        COALESCE(NEW.reposts_count, 0) * 5.0 +
        COALESCE(NEW.bookmarks_count, 0) * 4.0 +
        COALESCE(NEW.quotes_count, 0) * 8.0;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER projects_engagement_score_trigger
    BEFORE INSERT OR UPDATE OF likes_count, comments_count, reposts_count, bookmarks_count, quotes_count
    ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_project_engagement_score();
    """

    # Create trigger function to auto-update engagement_score on gigs
    execute """
    CREATE OR REPLACE FUNCTION update_gig_engagement_score()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.engagement_score :=
        COALESCE(NEW.bids_count, 0) * 15.0 +
        COALESCE(NEW.views_count, 0) * 0.5;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """

    execute """
    CREATE TRIGGER gigs_engagement_score_trigger
    BEFORE INSERT OR UPDATE OF bids_count, views_count
    ON gigs
    FOR EACH ROW
    EXECUTE FUNCTION update_gig_engagement_score();
    """
  end

  def down do
    # Drop triggers
    execute "DROP TRIGGER IF EXISTS posts_engagement_score_trigger ON posts"
    execute "DROP TRIGGER IF EXISTS projects_engagement_score_trigger ON projects"
    execute "DROP TRIGGER IF EXISTS gigs_engagement_score_trigger ON gigs"

    # Drop trigger functions
    execute "DROP FUNCTION IF EXISTS update_post_engagement_score()"
    execute "DROP FUNCTION IF EXISTS update_project_engagement_score()"
    execute "DROP FUNCTION IF EXISTS update_gig_engagement_score()"

    # Drop indexes
    drop_if_exists index(:posts, [:engagement_score], name: :posts_engagement_score_idx)
    drop_if_exists index(:projects, [:engagement_score], name: :projects_engagement_score_idx)
    drop_if_exists index(:gigs, [:engagement_score], name: :gigs_engagement_score_idx)
    drop_if_exists index(:posts, [:engagement_score, :inserted_at], name: :posts_feed_score_idx)
    drop_if_exists index(:projects, [:engagement_score, :published_at], name: :projects_feed_score_idx)
    drop_if_exists index(:gigs, [:engagement_score, :inserted_at], name: :gigs_feed_score_idx)

    # Remove columns
    alter table(:posts) do
      remove :engagement_score
    end

    alter table(:projects) do
      remove :engagement_score
    end

    alter table(:gigs) do
      remove :engagement_score
    end
  end
end
