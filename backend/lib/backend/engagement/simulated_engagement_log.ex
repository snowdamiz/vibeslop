defmodule Backend.Engagement.SimulatedEngagementLog do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @engagement_types ~w(like repost comment follow bookmark quote)
  @target_types ~w(Post Project User Comment)
  @statuses ~w(pending scheduled executed failed skipped)

  schema "simulated_engagement_log" do
    field :engagement_type, :string
    field :target_type, :string
    field :target_id, :binary_id
    field :scheduled_for, :utc_datetime
    field :executed_at, :utc_datetime
    field :status, :string, default: "pending"
    field :metadata, :map, default: %{}

    belongs_to :bot_user, Backend.Engagement.EngagementBotUser

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(log, attrs) do
    log
    |> cast(attrs, [
      :bot_user_id,
      :engagement_type,
      :target_type,
      :target_id,
      :scheduled_for,
      :status,
      :metadata
    ])
    |> validate_required([:bot_user_id, :engagement_type, :target_type, :target_id, :scheduled_for])
    |> validate_inclusion(:engagement_type, @engagement_types)
    |> validate_inclusion(:target_type, @target_types)
    |> validate_inclusion(:status, @statuses)
    |> foreign_key_constraint(:bot_user_id)
  end

  @doc false
  def execution_changeset(log, attrs) do
    log
    |> cast(attrs, [:status, :executed_at, :metadata])
    |> validate_inclusion(:status, @statuses)
  end
end
