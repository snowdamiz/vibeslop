defmodule Backend.Gigs.Gig do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "gigs" do
    field :title, :string
    field :description, :string
    field :budget_min, :integer
    field :budget_max, :integer
    field :currency, :string, default: "USD"
    field :deadline, :date
    field :status, :string, default: "open"
    field :bids_count, :integer, default: 0
    field :views_count, :integer, default: 0

    belongs_to :user, Backend.Accounts.User
    belongs_to :hired_bid, Backend.Gigs.Bid

    has_many :bids, Backend.Gigs.Bid
    has_many :reviews, Backend.Gigs.GigReview

    many_to_many :ai_tools, Backend.Catalog.AiTool, join_through: "gig_ai_tools"
    many_to_many :tech_stacks, Backend.Catalog.TechStack, join_through: "gig_tech_stacks"

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(gig, attrs) do
    gig
    |> cast(attrs, [
      :title,
      :description,
      :budget_min,
      :budget_max,
      :currency,
      :deadline,
      :status,
      :user_id,
      :hired_bid_id
    ])
    |> validate_required([:title, :description, :user_id])
    |> validate_length(:title, max: 200)
    |> validate_inclusion(:status, ["open", "in_progress", "completed", "cancelled"])
    |> validate_budget_range()
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:hired_bid_id)
  end

  defp validate_budget_range(changeset) do
    budget_min = get_field(changeset, :budget_min)
    budget_max = get_field(changeset, :budget_max)

    if budget_min && budget_max && budget_min > budget_max do
      add_error(changeset, :budget_max, "must be greater than or equal to budget_min")
    else
      changeset
    end
  end
end
