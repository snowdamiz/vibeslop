defmodule Backend.Engagement.BotSelector do
  @moduledoc """
  Module for selecting which bots should engage with content.

  Implements bot selection algorithms that consider:
  - Current time vs bot's preferred hours
  - Current day vs bot's active days
  - Bot's daily engagement limits
  - Previous engagements with the same content
  - Persona-based engagement style preferences
  """

  import Ecto.Query
  alias Backend.Repo
  alias Backend.Engagement.{EngagementBotUser, SimulatedEngagementLog, Timing}

  @doc """
  Selects bots for engagement with given content.

  Options:
  - `count` - Number of bots to select
  - `target_type` - "Post" or "Project"
  - `target_id` - ID of the content
  - `engagement_type` - "like", "repost", "comment", or "follow"

  Returns a list of bot users that are eligible to engage.
  """
  def select_bots(opts \\ []) do
    count = Keyword.get(opts, :count, 10)
    target_type = Keyword.get(opts, :target_type)
    target_id = Keyword.get(opts, :target_id)
    engagement_type = Keyword.get(opts, :engagement_type)

    now = DateTime.utc_now()
    current_hour = now.hour
    # Day of week: 0 = Sunday, 6 = Saturday
    current_day = Date.day_of_week(DateTime.to_date(now), :sunday)

    query =
      from b in EngagementBotUser,
        where: b.is_active == true,
        where: ^current_hour in b.preferred_hours,
        where: ^current_day in b.active_days,
        where: b.engagements_today < b.daily_engagement_limit,
        preload: [:user]

    # Exclude bots that already engaged with this content for this type
    query =
      if target_type && target_id && engagement_type do
        from b in query,
          where:
            b.id not in subquery(
              from l in SimulatedEngagementLog,
                where: l.target_type == ^target_type,
                where: l.target_id == ^target_id,
                where: l.engagement_type == ^engagement_type,
                where: l.status in ["pending", "scheduled", "executed"],
                select: l.bot_user_id
            )
      else
        query
      end

    available_bots = Repo.all(query)

    # Shuffle and take requested count
    available_bots
    |> Enum.shuffle()
    |> Enum.take(count)
  end

  @doc """
  Selects bots for a specific engagement type based on their persona weights.

  This filters bots who are likely to perform this type of engagement
  based on their engagement_style weights.
  """
  def select_bots_for_type(engagement_type, opts \\ []) do
    base_bots = select_bots(opts)

    # Filter based on engagement style probability
    Enum.filter(base_bots, fn bot ->
      Timing.should_engage?(bot.engagement_style, engagement_type)
    end)
  end

  @doc """
  Plans engagement distribution across available bots.

  Returns a map with bot assignments for each engagement type.
  """
  def plan_engagement_distribution(content, intensity) do
    target_type = content_type(content)
    target_id = content.id
    content_author_id = content.user_id

    # Get engagement counts for this intensity
    counts = Timing.engagement_counts_for_intensity(intensity)

    # Select bots for each type
    like_bots =
      select_bots_for_type("like",
        count: counts.likes * 2,
        target_type: target_type,
        target_id: target_id,
        engagement_type: "like"
      )
      |> Enum.take(counts.likes)

    repost_bots =
      select_bots_for_type("repost",
        count: counts.reposts * 2,
        target_type: target_type,
        target_id: target_id,
        engagement_type: "repost"
      )
      |> Enum.take(counts.reposts)

    comment_bots =
      select_bots_for_type("comment",
        count: counts.comments * 2,
        target_type: target_type,
        target_id: target_id,
        engagement_type: "comment"
      )
      |> Enum.take(counts.comments)

    # For follows, we target the content author
    follow_bots =
      if target_type == "Post" do
        select_bots_for_type("follow",
          count: round(counts.likes * 0.1) + 1,
          target_type: "User",
          target_id: content_author_id,
          engagement_type: "follow"
        )
        |> Enum.take(max(1, round(counts.likes * 0.1)))
      else
        []
      end

    %{
      likes: like_bots,
      reposts: repost_bots,
      comments: comment_bots,
      follows: follow_bots,
      target_type: target_type,
      target_id: target_id,
      content_author_id: content_author_id
    }
  end

  @doc """
  Counts how many bots are currently available for engagement.
  """
  def count_available_bots do
    now = DateTime.utc_now()
    current_hour = now.hour
    current_day = Date.day_of_week(DateTime.to_date(now), :sunday)

    from(b in EngagementBotUser,
      where: b.is_active == true,
      where: ^current_hour in b.preferred_hours,
      where: ^current_day in b.active_days,
      where: b.engagements_today < b.daily_engagement_limit
    )
    |> Repo.aggregate(:count)
  end

  @doc """
  Gets bots that have remaining daily capacity.
  """
  def bots_with_capacity do
    from(b in EngagementBotUser,
      where: b.is_active == true,
      where: b.engagements_today < b.daily_engagement_limit,
      preload: [:user]
    )
    |> Repo.all()
  end

  @doc """
  Checks if a specific bot can engage with content right now.
  """
  def bot_can_engage?(%EngagementBotUser{} = bot, target_type, target_id, engagement_type) do
    now = DateTime.utc_now()
    current_hour = now.hour
    current_day = Date.day_of_week(DateTime.to_date(now), :sunday)

    # Check activity requirements
    is_active = bot.is_active
    in_preferred_hours = current_hour in bot.preferred_hours
    in_active_days = current_day in bot.active_days
    under_daily_limit = bot.engagements_today < bot.daily_engagement_limit

    # Check if already engaged
    already_engaged =
      from(l in SimulatedEngagementLog,
        where: l.bot_user_id == ^bot.id,
        where: l.target_type == ^target_type,
        where: l.target_id == ^target_id,
        where: l.engagement_type == ^engagement_type,
        where: l.status in ["pending", "scheduled", "executed"]
      )
      |> Repo.exists?()

    is_active and in_preferred_hours and in_active_days and under_daily_limit and not already_engaged
  end

  defp content_type(%Backend.Content.Post{}), do: "Post"
  defp content_type(%Backend.Content.Project{}), do: "Project"
  defp content_type(%{__struct__: struct}), do: struct |> Module.split() |> List.last()
  defp content_type(_), do: "Unknown"
end
