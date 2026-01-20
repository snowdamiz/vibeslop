defmodule Backend.Repo.Migrations.AddRecommendationIndexes do
  use Ecto.Migration

  def change do
    # Index for friends-of-friends query (social graph)
    # This composite index helps join follows bidirectionally
    create_if_not_exists index(:follows, [:following_id, :follower_id])

    # Indexes for user activity checks (popularity score)
    create_if_not_exists index(:posts, [:user_id, :inserted_at])
    create_if_not_exists index(:projects, [:user_id, :published_at])

    # Indexes for engagement lookups (engagement velocity)
    create_if_not_exists index(:engagement_hourly, [:content_type, :content_id, :hour_bucket])

    # Indexes for relevance scoring (shared tools/stacks)
    create_if_not_exists index(:project_ai_tools, [:project_id, :ai_tool_id])
    create_if_not_exists index(:project_tech_stacks, [:project_id, :tech_stack_id])

    # Composite index for likes on projects (relevance query)
    create_if_not_exists index(:likes, [:user_id, :likeable_type, :likeable_id])

    # Composite index for bookmarks on projects (relevance query)
    create_if_not_exists index(:bookmarks, [:user_id, :bookmarkable_type, :bookmarkable_id])
  end
end
