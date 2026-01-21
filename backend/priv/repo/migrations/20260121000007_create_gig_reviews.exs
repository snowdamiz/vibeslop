defmodule Backend.Repo.Migrations.CreateGigReviews do
  use Ecto.Migration

  def change do
    create table(:gig_reviews, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :rating, :integer, null: false
      add :content, :text
      add :review_type, :string, null: false

      add :gig_id, references(:gigs, on_delete: :delete_all, type: :binary_id), null: false
      add :reviewer_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false
      add :reviewee_id, references(:users, on_delete: :delete_all, type: :binary_id), null: false

      timestamps(type: :utc_datetime)
    end

    create index(:gig_reviews, [:gig_id])
    create index(:gig_reviews, [:reviewer_id])
    create index(:gig_reviews, [:reviewee_id])

    create unique_index(:gig_reviews, [:gig_id, :reviewer_id],
             name: :gig_reviews_gig_reviewer_unique_index
           )

    # Check constraint for rating (1-5)
    create constraint(:gig_reviews, :rating_must_be_between_1_and_5,
             check: "rating >= 1 AND rating <= 5"
           )
  end
end
