defmodule Backend.Engagement.Workers.BotViewWorker do
  @moduledoc """
  Oban worker that simulates bots viewing content by scrolling through the feed.

  Runs periodically to have bots generate impressions on posts and projects,
  making them appear as active users who browse the platform.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 900]

  import Ecto.Query

  alias Backend.Repo
  alias Backend.Engagement
  alias Backend.Engagement.EngagementBotUser
  alias Backend.Content.{Post, Project}
  alias Backend.Social

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    # Check if engagement system is enabled
    unless Engagement.engagement_enabled?() do
      Logger.debug("BotViewWorker: Engagement system disabled, skipping")
      return(:ok)
    end

    Logger.info("BotViewWorker: Starting feed viewing simulation")

    # Get intensity setting to determine how many bots and how much content
    intensity = Engagement.engagement_intensity()

    # Select bots to "view" the feed
    bots_to_activate = select_viewing_bots(intensity)

    if Enum.empty?(bots_to_activate) do
      Logger.debug("BotViewWorker: No available bots for viewing")
      return(:ok)
    end

    Logger.info("BotViewWorker: #{length(bots_to_activate)} bots will view the feed")

    # Get recent content to view
    {recent_posts, recent_projects} = get_viewable_content(intensity)

    total_content = length(recent_posts) + length(recent_projects)

    if total_content == 0 do
      Logger.debug("BotViewWorker: No content to view")
      return(:ok)
    end

    Logger.info("BotViewWorker: Found #{length(recent_posts)} posts and #{length(recent_projects)} projects to view")

    # Have each bot "scroll" through some content
    total_views =
      bots_to_activate
      |> Enum.map(fn bot ->
        simulate_bot_viewing(bot, recent_posts, recent_projects, intensity)
      end)
      |> Enum.sum()

    Logger.info("BotViewWorker: Recorded #{total_views} total views")

    :ok
  end

  defp return(value), do: value

  defp select_viewing_bots(intensity) do
    now = DateTime.utc_now()
    current_hour = now.hour
    current_day = Date.day_of_week(DateTime.to_date(now), :sunday)

    # Get active bots for current time
    available_bots =
      from(b in EngagementBotUser,
        where: b.is_active == true,
        where: ^current_hour in b.preferred_hours,
        where: ^current_day in b.active_days,
        preload: [:user]
      )
      |> Repo.all()

    # Select a portion based on intensity
    count_to_select =
      case intensity do
        "high" -> max(1, round(length(available_bots) * 0.8))
        "medium" -> max(1, round(length(available_bots) * 0.5))
        "low" -> max(1, round(length(available_bots) * 0.3))
        _ -> max(1, round(length(available_bots) * 0.5))
      end

    available_bots
    |> Enum.shuffle()
    |> Enum.take(count_to_select)
  end

  defp get_viewable_content(intensity) do
    # Time window for content based on intensity
    hours_back =
      case intensity do
        "high" -> 48
        "medium" -> 24
        "low" -> 12
        _ -> 24
      end

    since = DateTime.add(DateTime.utc_now(), -hours_back, :hour)

    # Limit based on intensity
    limit =
      case intensity do
        "high" -> 50
        "medium" -> 30
        "low" -> 15
        _ -> 30
      end

    # Get recent posts (prioritize newer ones)
    recent_posts =
      from(p in Post,
        where: p.inserted_at > ^since,
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        select: %{id: p.id, type: "Post"}
      )
      |> Repo.all()

    # Get recent projects (prioritize newer ones)
    recent_projects =
      from(p in Project,
        where: p.status == "published",
        where: p.published_at > ^since,
        order_by: [desc: p.published_at],
        limit: ^limit,
        select: %{id: p.id, type: "Project"}
      )
      |> Repo.all()

    {recent_posts, recent_projects}
  end

  defp simulate_bot_viewing(bot, posts, projects, intensity) do
    # Combine and shuffle content (simulating random feed scroll)
    all_content = Enum.shuffle(posts ++ projects)

    # Determine how much content this bot will view based on persona
    view_count = determine_view_count(bot, length(all_content), intensity)

    # Take a random subset of content to view
    content_to_view = Enum.take(all_content, view_count)

    # Record impressions for each piece of content
    views_recorded =
      content_to_view
      |> Enum.map(fn content ->
        record_bot_impression(bot, content)
      end)
      |> Enum.count(& &1)

    Logger.debug("BotViewWorker: @#{bot.user.username} viewed #{views_recorded} items")

    views_recorded
  end

  defp determine_view_count(bot, available_content, intensity) do
    # Base view count based on persona
    base_count =
      case bot.persona_type do
        "enthusiast" -> Enum.random(15..30)
        "casual" -> Enum.random(8..15)
        "supportive" -> Enum.random(10..20)
        "lurker" -> Enum.random(20..40)  # Lurkers browse a lot but don't engage
        _ -> Enum.random(10..20)
      end

    # Adjust by intensity
    intensity_multiplier =
      case intensity do
        "high" -> 1.5
        "medium" -> 1.0
        "low" -> 0.6
        _ -> 1.0
      end

    adjusted_count = round(base_count * intensity_multiplier)

    # Cap at available content
    min(adjusted_count, available_content)
  end

  defp record_bot_impression(bot, content) do
    result =
      Social.record_impression(
        content.type,
        content.id,
        user_id: bot.user_id,
        fingerprint: nil,
        ip_address: generate_bot_ip()
      )

    case result do
      {:ok, %Backend.Social.Impression{}} -> true
      {:ok, :already_impressed} -> false
      {:error, _reason} -> false
    end
  end

  # Generate a fake internal IP for bot views (for analytics differentiation if needed)
  defp generate_bot_ip do
    # Use 10.x.x.x range (private IP) to distinguish bot views if needed
    "10.0.#{Enum.random(0..255)}.#{Enum.random(1..254)}"
  end

  @doc """
  Manually trigger a bot viewing session. Useful for testing.
  """
  def trigger_views do
    %{} |> new() |> Oban.insert()
  end
end
