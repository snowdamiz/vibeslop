defmodule Backend.Engagement.EngagementBotUser do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  @persona_types ~w(enthusiast casual supportive lurker)
  @activity_levels ~w(high medium low)

  schema "engagement_bot_users" do
    field :persona_type, :string
    field :activity_level, :string
    field :preferred_hours, {:array, :integer}, default: []
    field :active_days, {:array, :integer}, default: []
    field :engagement_style, :map, default: %{}
    field :daily_engagement_limit, :integer, default: 50
    field :engagements_today, :integer, default: 0
    field :last_engaged_at, :utc_datetime
    field :total_engagements, :integer, default: 0
    field :is_active, :boolean, default: true

    belongs_to :user, Backend.Accounts.User
    has_many :engagement_logs, Backend.Engagement.SimulatedEngagementLog, foreign_key: :bot_user_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(bot_user, attrs) do
    bot_user
    |> cast(attrs, [
      :user_id,
      :persona_type,
      :activity_level,
      :preferred_hours,
      :active_days,
      :engagement_style,
      :daily_engagement_limit,
      :is_active
    ])
    |> validate_required([:user_id, :persona_type, :activity_level])
    |> validate_inclusion(:persona_type, @persona_types)
    |> validate_inclusion(:activity_level, @activity_levels)
    |> validate_number(:daily_engagement_limit, greater_than: 0, less_than_or_equal_to: 200)
    |> validate_hours(:preferred_hours)
    |> validate_days(:active_days)
    |> foreign_key_constraint(:user_id)
    |> unique_constraint(:user_id)
  end

  @doc false
  def engagement_changeset(bot_user, attrs) do
    bot_user
    |> cast(attrs, [:engagements_today, :last_engaged_at, :total_engagements])
  end

  @doc false
  def daily_reset_changeset(bot_user) do
    bot_user
    |> change(engagements_today: 0)
  end

  defp validate_hours(changeset, field) do
    validate_change(changeset, field, fn _, hours ->
      if Enum.all?(hours, &(&1 >= 0 and &1 <= 23)) do
        []
      else
        [{field, "must contain valid hours (0-23)"}]
      end
    end)
  end

  defp validate_days(changeset, field) do
    validate_change(changeset, field, fn _, days ->
      if Enum.all?(days, &(&1 >= 0 and &1 <= 6)) do
        []
      else
        [{field, "must contain valid days (0-6, where 0=Sunday)"}]
      end
    end)
  end

  @doc "Returns default engagement style weights for a persona type"
  def default_engagement_style(persona_type) do
    case persona_type do
      "enthusiast" ->
        %{
          "like_weight" => 0.4,
          "repost_weight" => 0.25,
          "comment_weight" => 0.25,
          "follow_weight" => 0.1
        }

      "casual" ->
        %{
          "like_weight" => 0.7,
          "repost_weight" => 0.15,
          "comment_weight" => 0.1,
          "follow_weight" => 0.05
        }

      "supportive" ->
        %{
          "like_weight" => 0.3,
          "repost_weight" => 0.2,
          "comment_weight" => 0.4,
          "follow_weight" => 0.1
        }

      "lurker" ->
        %{
          "like_weight" => 0.85,
          "repost_weight" => 0.05,
          "comment_weight" => 0.05,
          "follow_weight" => 0.05
        }

      _ ->
        %{
          "like_weight" => 0.5,
          "repost_weight" => 0.2,
          "comment_weight" => 0.2,
          "follow_weight" => 0.1
        }
    end
  end

  @doc "Returns default daily limit for a persona type"
  def default_daily_limit(persona_type) do
    case persona_type do
      "enthusiast" -> Enum.random(50..80)
      "casual" -> Enum.random(20..40)
      "supportive" -> Enum.random(30..50)
      "lurker" -> Enum.random(5..15)
      _ -> 30
    end
  end

  @doc "Returns default preferred hours for a persona type (24-hour availability)"
  def default_preferred_hours(_persona_type) do
    # All bots have 24-hour availability to ensure engagement works across timezones
    Enum.to_list(0..23)
  end

  @doc "Returns default active days (all days by default)"
  def default_active_days(_persona_type) do
    [0, 1, 2, 3, 4, 5, 6]
  end
end
