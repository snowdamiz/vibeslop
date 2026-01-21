defmodule Backend.Repo.Migrations.BackfillEngagementCounters do
  use Ecto.Migration

  def up do
    # Backfill likes_count on posts
    execute """
    UPDATE posts SET likes_count = (
      SELECT COUNT(*) FROM likes
      WHERE likes.likeable_type = 'Post'
      AND likes.likeable_id = posts.id
    )
    """

    # Backfill comments_count on posts
    execute """
    UPDATE posts SET comments_count = (
      SELECT COUNT(*) FROM comments
      WHERE comments.commentable_type = 'Post'
      AND comments.commentable_id = posts.id
    )
    """

    # Backfill reposts_count on posts
    execute """
    UPDATE posts SET reposts_count = (
      SELECT COUNT(*) FROM reposts
      WHERE reposts.repostable_type = 'Post'
      AND reposts.repostable_id = posts.id
    )
    """

    # Backfill bookmarks_count on posts
    execute """
    UPDATE posts SET bookmarks_count = (
      SELECT COUNT(*) FROM bookmarks
      WHERE bookmarks.bookmarkable_type = 'Post'
      AND bookmarks.bookmarkable_id = posts.id
    )
    """

    # Backfill quotes_count on posts (posts that quote this post)
    execute """
    UPDATE posts SET quotes_count = (
      SELECT COUNT(*) FROM posts AS quoting_posts
      WHERE quoting_posts.quoted_post_id = posts.id
    )
    """

    # Backfill likes_count on projects
    execute """
    UPDATE projects SET likes_count = (
      SELECT COUNT(*) FROM likes
      WHERE likes.likeable_type = 'Project'
      AND likes.likeable_id = projects.id
    )
    """

    # Backfill comments_count on projects
    execute """
    UPDATE projects SET comments_count = (
      SELECT COUNT(*) FROM comments
      WHERE comments.commentable_type = 'Project'
      AND comments.commentable_id = projects.id
    )
    """

    # Backfill reposts_count on projects
    execute """
    UPDATE projects SET reposts_count = (
      SELECT COUNT(*) FROM reposts
      WHERE reposts.repostable_type = 'Project'
      AND reposts.repostable_id = projects.id
    )
    """

    # Backfill bookmarks_count on projects
    execute """
    UPDATE projects SET bookmarks_count = (
      SELECT COUNT(*) FROM bookmarks
      WHERE bookmarks.bookmarkable_type = 'Project'
      AND bookmarks.bookmarkable_id = projects.id
    )
    """

    # Backfill quotes_count on projects (posts that quote this project)
    execute """
    UPDATE projects SET quotes_count = (
      SELECT COUNT(*) FROM posts
      WHERE posts.quoted_project_id = projects.id
    )
    """
  end

  def down do
    # Reset all counters to 0
    execute "UPDATE posts SET likes_count = 0, comments_count = 0, reposts_count = 0, bookmarks_count = 0, quotes_count = 0"

    execute "UPDATE projects SET likes_count = 0, comments_count = 0, reposts_count = 0, bookmarks_count = 0, quotes_count = 0"
  end
end
