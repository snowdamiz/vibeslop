defmodule Backend.Gigs.GigReview do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "gig_reviews" do
    field :rating, :integer
    field :content, :string
    field :review_type, :string

    belongs_to :gig, Backend.Gigs.Gig
    belongs_to :reviewer, Backend.Accounts.User
    belongs_to :reviewee, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(review, attrs) do
    review
    |> cast(attrs, [:rating, :content, :review_type, :gig_id, :reviewer_id, :reviewee_id])
    |> validate_required([:rating, :review_type, :gig_id, :reviewer_id, :reviewee_id])
    |> validate_number(:rating, greater_than_or_equal_to: 1, less_than_or_equal_to: 5)
    |> validate_length(:content, max: 1000)
    |> validate_inclusion(:review_type, ["client_to_freelancer", "freelancer_to_client"])
    |> foreign_key_constraint(:gig_id)
    |> foreign_key_constraint(:reviewer_id)
    |> foreign_key_constraint(:reviewee_id)
    |> unique_constraint([:gig_id, :reviewer_id], name: :gig_reviews_gig_reviewer_unique_index)
  end
end
