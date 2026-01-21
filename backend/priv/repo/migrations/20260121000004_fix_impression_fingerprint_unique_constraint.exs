defmodule Backend.Repo.Migrations.FixImpressionFingerprintUniqueConstraint do
  use Ecto.Migration

  def up do
    # Drop the old fingerprint unique index that only applied when user_id IS NULL
    drop_if_exists unique_index(
                     :impressions,
                     [:fingerprint, :impressionable_type, :impressionable_id],
                     name: :impressions_fingerprint_unique_index
                   )

    # Clean up duplicate impressions before creating new constraint
    # Keep the impression with user_id (authenticated) and delete the anonymous duplicate
    execute """
    DELETE FROM impressions i1
    WHERE i1.user_id IS NULL
    AND EXISTS (
      SELECT 1 FROM impressions i2
      WHERE i2.fingerprint = i1.fingerprint
      AND i2.impressionable_type = i1.impressionable_type
      AND i2.impressionable_id = i1.impressionable_id
      AND i2.user_id IS NOT NULL
      AND i2.id != i1.id
    )
    """

    # Also handle any remaining duplicates (same fingerprint, multiple anonymous)
    # Keep the oldest impression (by inserted_at timestamp)
    execute """
    DELETE FROM impressions i1
    WHERE i1.fingerprint IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM impressions i2
      WHERE i2.fingerprint = i1.fingerprint
      AND i2.impressionable_type = i1.impressionable_type
      AND i2.impressionable_id = i1.impressionable_id
      AND i2.inserted_at < i1.inserted_at
    )
    """

    # Recalculate impression counts for posts to fix any inflated numbers
    execute """
    UPDATE posts
    SET impression_count = (
      SELECT COUNT(*)
      FROM impressions
      WHERE impressions.impressionable_type = 'Post'
      AND impressions.impressionable_id = posts.id
    )
    """

    # Recalculate view counts for projects to fix any inflated numbers
    execute """
    UPDATE projects
    SET view_count = (
      SELECT COUNT(*)
      FROM impressions
      WHERE impressions.impressionable_type = 'Project'
      AND impressions.impressionable_id = projects.id
    )
    """

    # Create new fingerprint unique index that applies regardless of user_id
    # This prevents the same fingerprint from creating multiple impressions for the same content,
    # even if one impression has a user_id (authenticated) and one doesn't (anonymous)
    create unique_index(:impressions, [:fingerprint, :impressionable_type, :impressionable_id],
             where: "fingerprint IS NOT NULL",
             name: :impressions_fingerprint_unique_index
           )
  end

  def down do
    # Revert to the old constraint (only applies when user_id IS NULL)
    drop_if_exists unique_index(
                     :impressions,
                     [:fingerprint, :impressionable_type, :impressionable_id],
                     name: :impressions_fingerprint_unique_index
                   )

    create unique_index(:impressions, [:fingerprint, :impressionable_type, :impressionable_id],
             where: "fingerprint IS NOT NULL AND user_id IS NULL",
             name: :impressions_fingerprint_unique_index
           )
  end
end
