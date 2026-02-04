defmodule Backend.Engagement.Workers.EngagementSchedulerWorker do
  @moduledoc """
  Oban worker that schedules individual engagement actions for a piece of content.

  Takes a content item and creates timed engagement log entries that will
  be executed by the EngagementExecutorWorker at their scheduled times.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 300, keys: [:content_type, :content_id]]

  alias Backend.Repo
  alias Backend.Content.{Post, Project}
  alias Backend.Engagement
  alias Backend.Engagement.{BotSelector, Timing, CommentGenerator, BotPostGenerator}
  alias Backend.Engagement.Workers.EngagementExecutorWorker

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{
        args: %{
          "content_type" => content_type,
          "content_id" => content_id,
          "author_id" => author_id,
          "created_at" => created_at_str,
          "multiplier" => multiplier
        }
      }) do
    # Check if engagement system is enabled
    unless Engagement.engagement_enabled?() do
      Logger.debug("EngagementSchedulerWorker: Engagement system disabled, skipping")
      return(:ok)
    end

    Logger.info("EngagementSchedulerWorker: Planning engagement for #{content_type} #{content_id}")

    # Load the content
    content = load_content(content_type, content_id)

    unless content do
      Logger.warning("EngagementSchedulerWorker: Content not found, skipping")
      return(:ok)
    end

    # Get intensity setting
    intensity = Engagement.engagement_intensity()

    # Parse created_at
    {:ok, created_at, _} = DateTime.from_iso8601(created_at_str)

    # Get engagement counts for this intensity
    base_counts = Timing.engagement_counts_for_intensity(intensity)

    # Apply multiplier for curated content
    counts = %{
      likes: round(base_counts.likes * multiplier),
      reposts: round(base_counts.reposts * multiplier),
      comments: round(base_counts.comments * multiplier),
      bookmarks: round(base_counts.bookmarks * multiplier),
      quotes: round(base_counts.quotes * multiplier)
    }

    # Get available bots for each engagement type
    like_bots = BotSelector.select_bots_for_type("like",
      count: counts.likes,
      target_type: content_type,
      target_id: content_id,
      engagement_type: "like"
    )

    repost_bots = BotSelector.select_bots_for_type("repost",
      count: counts.reposts,
      target_type: content_type,
      target_id: content_id,
      engagement_type: "repost"
    )

    comment_bots = BotSelector.select_bots_for_type("comment",
      count: counts.comments,
      target_type: content_type,
      target_id: content_id,
      engagement_type: "comment"
    )

    bookmark_bots = BotSelector.select_bots_for_type("bookmark",
      count: counts.bookmarks,
      target_type: content_type,
      target_id: content_id,
      engagement_type: "bookmark"
    )

    quote_bots = BotSelector.select_bots_for_type("quote",
      count: counts.quotes,
      target_type: content_type,
      target_id: content_id,
      engagement_type: "quote"
    )

    # Also schedule some follows for the content author
    follow_count = max(1, round(counts.likes * 0.1))
    follow_bots = BotSelector.select_bots_for_type("follow",
      count: follow_count,
      target_type: "User",
      target_id: author_id,
      engagement_type: "follow"
    )

    Logger.info(
      "EngagementSchedulerWorker: Selected bots - likes: #{length(like_bots)}, " <>
        "reposts: #{length(repost_bots)}, comments: #{length(comment_bots)}, " <>
        "bookmarks: #{length(bookmark_bots)}, quotes: #{length(quote_bots)}, follows: #{length(follow_bots)}"
    )

    # Generate timestamps for engagements
    total_engagements =
      length(like_bots) + length(repost_bots) + length(comment_bots) +
        length(bookmark_bots) + length(quote_bots) + length(follow_bots)

    if total_engagements == 0 do
      Logger.warning("EngagementSchedulerWorker: No available bots for engagement")
      return(:ok)
    end

    times =
      Timing.generate_engagement_times(total_engagements,
        intensity: intensity,
        content_created_at: created_at,
        multiplier: 1.0
      )

    # Generate comments for comment bots
    comments = generate_comments_for_bots(content, comment_bots)

    # Generate quote text for quote bots
    quotes = generate_quotes_for_bots(content, quote_bots)

    # Calculate time offsets for each engagement type
    like_offset = 0
    repost_offset = like_offset + length(like_bots)
    comment_offset = repost_offset + length(repost_bots)
    bookmark_offset = comment_offset + length(comment_bots)
    quote_offset = bookmark_offset + length(bookmark_bots)
    follow_offset = quote_offset + length(quote_bots)

    # Schedule all engagements
    scheduled =
      schedule_engagements(like_bots, "like", content_type, content_id, Enum.drop(times, like_offset)) ++
        schedule_engagements(repost_bots, "repost", content_type, content_id, Enum.drop(times, repost_offset)) ++
        schedule_comment_engagements(comment_bots, comments, content_type, content_id, Enum.drop(times, comment_offset)) ++
        schedule_engagements(bookmark_bots, "bookmark", content_type, content_id, Enum.drop(times, bookmark_offset)) ++
        schedule_quote_engagements(quote_bots, quotes, content_type, content_id, Enum.drop(times, quote_offset)) ++
        schedule_engagements(follow_bots, "follow", "User", author_id, Enum.drop(times, follow_offset))

    success_count = Enum.count(scheduled, fn {status, _} -> status == :ok end)
    Logger.info("EngagementSchedulerWorker: Scheduled #{success_count} engagements")

    :ok
  end

  defp return(value), do: value

  defp load_content("Post", id), do: Repo.get(Post, id)
  defp load_content("Project", id), do: Repo.get(Project, id)
  defp load_content(_, _), do: nil

  defp generate_comments_for_bots(content, comment_bots) do
    comment_bots
    |> Enum.map(fn bot ->
      case CommentGenerator.generate_comment(content, bot) do
        {:ok, comment} -> {bot.id, comment}
        {:error, _} -> {bot.id, "Nice!"}
      end
    end)
    |> Map.new()
  end

  defp generate_quotes_for_bots(content, quote_bots) do
    quote_bots
    |> Enum.map(fn bot ->
      {:ok, quote_text} = BotPostGenerator.generate_quote(bot, content)
      {bot.id, quote_text}
    end)
    |> Map.new()
  end

  defp schedule_engagements(bots, engagement_type, target_type, target_id, times) do
    bots
    |> Enum.zip(times)
    |> Enum.map(fn {bot, scheduled_for} ->
      schedule_single_engagement(bot, engagement_type, target_type, target_id, scheduled_for, %{})
    end)
  end

  defp schedule_comment_engagements(bots, comments, target_type, target_id, times) do
    bots
    |> Enum.zip(times)
    |> Enum.map(fn {bot, scheduled_for} ->
      comment_text = Map.get(comments, bot.id, "Nice!")
      metadata = %{"comment_text" => comment_text}
      schedule_single_engagement(bot, "comment", target_type, target_id, scheduled_for, metadata)
    end)
  end

  defp schedule_quote_engagements(bots, quotes, target_type, target_id, times) do
    bots
    |> Enum.zip(times)
    |> Enum.map(fn {bot, scheduled_for} ->
      quote_text = Map.get(quotes, bot.id, "Check this out!")
      metadata = %{"quote_text" => quote_text}
      schedule_single_engagement(bot, "quote", target_type, target_id, scheduled_for, metadata)
    end)
  end

  defp schedule_single_engagement(bot, engagement_type, target_type, target_id, scheduled_for, metadata) do
    # Create the engagement log entry
    log_attrs = %{
      bot_user_id: bot.id,
      engagement_type: engagement_type,
      target_type: target_type,
      target_id: target_id,
      scheduled_for: scheduled_for |> DateTime.truncate(:second),
      status: "pending",
      metadata: metadata
    }

    case Engagement.create_engagement_log(log_attrs) do
      {:ok, log} ->
        # Schedule the executor job
        delay_seconds = DateTime.diff(scheduled_for, DateTime.utc_now(), :second)
        delay_seconds = max(0, delay_seconds)

        job_args = %{"log_id" => log.id}

        case EngagementExecutorWorker.new(job_args, schedule_in: delay_seconds)
             |> Oban.insert() do
          {:ok, _job} -> {:ok, log}
          {:error, reason} -> {:error, reason}
        end

      {:error, reason} ->
        Logger.error("Failed to create engagement log: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
