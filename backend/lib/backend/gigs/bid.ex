defmodule Backend.Gigs.Bid do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "bids" do
    field :amount, :integer
    field :currency, :string, default: "USD"
    field :delivery_days, :integer
    field :proposal, :string
    field :status, :string, default: "pending"

    belongs_to :gig, Backend.Gigs.Gig
    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(bid, attrs) do
    bid
    |> cast(attrs, [:amount, :currency, :delivery_days, :proposal, :status, :gig_id, :user_id])
    |> validate_required([:amount, :delivery_days, :proposal, :gig_id, :user_id])
    |> validate_number(:amount, greater_than: 0)
    |> validate_number(:delivery_days, greater_than: 0)
    |> validate_length(:proposal, min: 50, max: 2000)
    |> validate_inclusion(:status, ["pending", "accepted", "rejected", "withdrawn"])
    |> foreign_key_constraint(:gig_id)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint([:gig_id, :user_id], name: :bids_gig_user_unique_index)
  end
end
