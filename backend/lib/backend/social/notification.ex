defmodule Backend.Social.Notification do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "notifications" do
    # "like", "comment", "follow", "repost", "mention"
    field :type, :string
    # "Post", "Project", nil for follows
    field :target_type, :string
    field :target_id, :binary_id
    field :content_preview, :string
    field :read, :boolean, default: false

    belongs_to :user, Backend.Accounts.User
    belongs_to :actor, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(notification, attrs) do
    notification
    |> cast(attrs, [:type, :target_type, :target_id, :content_preview, :read, :user_id, :actor_id])
    |> validate_required([:type, :user_id, :actor_id])
    |> validate_inclusion(:type, [
      "like",
      "comment",
      "follow",
      "repost",
      "mention",
      "bid_received",
      "bid_accepted",
      "bid_rejected",
      "gig_completed",
      "review_received"
    ])
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:actor_id)
  end
end
