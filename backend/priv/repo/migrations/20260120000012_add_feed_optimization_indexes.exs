defmodule Backend.Repo.Migrations.AddFeedOptimizationIndexes do
  use Ecto.Migration

  def change do
    # Composite index for "following" feed - efficiently query posts by user and date
    create_if_not_exists index(:posts, [:user_id, :inserted_at])

    # Composite index for projects by user and published date
    create_if_not_exists index(:projects, [:user_id, :published_at])

    # Composite index for engagement-based sorting on posts
    # Used by the "for-you" algorithm to sort by weighted engagement
    create_if_not_exists index(:posts, [
                           :likes_count,
                           :comments_count,
                           :reposts_count,
                           :bookmarks_count
                         ])

    # Composite index for engagement-based sorting on projects
    create_if_not_exists index(:projects, [
                           :likes_count,
                           :comments_count,
                           :reposts_count,
                           :bookmarks_count
                         ])

    # Index for follows lookup - efficiently get followed user IDs
    create_if_not_exists index(:follows, [:follower_id, :following_id])

    # Index for reposts by user - for following feed repost inclusion
    create_if_not_exists index(:reposts, [:user_id, :inserted_at])
  end
end
