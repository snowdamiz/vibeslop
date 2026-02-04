defmodule Backend.Engagement.Workers.EngagementExecutorWorker do
  @moduledoc """
  Oban worker that executes individual engagement actions.

  Takes an engagement log entry and performs the actual engagement action
  (like, repost, comment, or follow) using the bot's user account.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3

  alias Backend.Repo
  alias Backend.Engagement
  alias Backend.Engagement.SimulatedEngagementLog
  alias Backend.Social
  alias Backend.Content

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"log_id" => log_id}}) do
    # Check if engagement system is enabled
    unless Engagement.engagement_enabled?() do
      Logger.debug("EngagementExecutorWorker: Engagement system disabled, skipping")
      return(:ok)
    end

    # Load the engagement log
    log =
      Repo.get(SimulatedEngagementLog, log_id)
      |> Repo.preload(bot_user: :user)

    unless log do
      Logger.warning("EngagementExecutorWorker: Log #{log_id} not found, skipping")
      return(:ok)
    end

    # Skip if already executed
    if log.status in ["executed", "skipped", "failed"] do
      Logger.debug("EngagementExecutorWorker: Log #{log_id} already processed (#{log.status})")
      return(:ok)
    end

    # Get the bot user
    bot_user = log.bot_user

    unless bot_user && bot_user.user do
      Logger.warning("EngagementExecutorWorker: Bot user not found for log #{log_id}")
      Engagement.mark_engagement_failed(log, "Bot user not found")
      return(:ok)
    end

    # Check if bot can still engage (hasn't hit limits, still in active hours)
    unless bot_user.is_active && bot_user.engagements_today < bot_user.daily_engagement_limit do
      Logger.debug("EngagementExecutorWorker: Bot #{bot_user.id} at daily limit or inactive")
      Engagement.mark_engagement_skipped(log, "Bot at daily limit or inactive")
      return(:ok)
    end

    Logger.info(
      "EngagementExecutorWorker: Executing #{log.engagement_type} for #{log.target_type} #{log.target_id}"
    )

    # Execute the engagement
    result = execute_engagement(log, bot_user)

    case result do
      :ok ->
        # Update the log and bot counters
        Engagement.mark_engagement_executed(log)
        Engagement.increment_bot_engagement(bot_user)
        Logger.info("EngagementExecutorWorker: Successfully executed #{log.engagement_type}")
        :ok

      {:error, reason} ->
        Logger.error("EngagementExecutorWorker: Failed to execute engagement: #{inspect(reason)}")
        Engagement.mark_engagement_failed(log, to_string(reason))
        :ok
    end
  end

  defp return(value), do: value

  defp execute_engagement(log, bot_user) do
    user = bot_user.user

    # For content engagements (not follows), ensure we record a view first
    # This prevents the illogical scenario of having more likes than views
    if log.engagement_type != "follow" and log.target_type in ["Post", "Project"] do
      ensure_impression_recorded(log.target_type, log.target_id, user.id)
    end

    case log.engagement_type do
      "like" ->
        execute_like(log.target_type, log.target_id, user.id)

      "repost" ->
        execute_repost(log.target_type, log.target_id, user.id)

      "comment" ->
        comment_text = Map.get(log.metadata || %{}, "comment_text", "Nice!")
        execute_comment(log.target_type, log.target_id, user.id, comment_text)

      "follow" ->
        execute_follow(log.target_id, user.id)

      "bookmark" ->
        execute_bookmark(log.target_type, log.target_id, user.id)

      "quote" ->
        quote_text = Map.get(log.metadata || %{}, "quote_text", "Check this out!")
        execute_quote(log.target_type, log.target_id, user.id, quote_text)

      _ ->
        {:error, "Unknown engagement type: #{log.engagement_type}"}
    end
  end

  # Ensure the bot has recorded an impression (view) for the content before engaging
  # This also increments the view counter just like real user impressions
  defp ensure_impression_recorded(target_type, target_id, user_id) do
    case Social.record_impression(
           target_type,
           target_id,
           user_id: user_id,
           fingerprint: nil,
           ip_address: generate_bot_ip()
         ) do
      {:ok, %Backend.Social.Impression{}} ->
        # Successfully recorded NEW impression - increment the view counter
        increment_view_counter(target_type, target_id)
        Backend.Metrics.record_hourly_engagement(target_type, target_id, :impressions)
        :ok

      {:ok, :already_impressed} ->
        # Already impressed, no need to increment counter
        :ok

      {:error, _reason} ->
        # Error recording impression, continue with engagement anyway
        :ok
    end
  end

  # Increment the appropriate view counter for the content type
  defp increment_view_counter("Post", post_id) do
    import Ecto.Query
    from(p in Backend.Content.Post, where: p.id == ^post_id)
    |> Repo.update_all(inc: [impression_count: 1])
  end

  defp increment_view_counter("Project", project_id) do
    import Ecto.Query
    from(p in Backend.Content.Project, where: p.id == ^project_id)
    |> Repo.update_all(inc: [view_count: 1])
  end

  defp increment_view_counter(_type, _id), do: :ok

  # Generate a fake internal IP for bot impressions
  defp generate_bot_ip do
    "10.0.#{Enum.random(0..255)}.#{Enum.random(1..254)}"
  end

  defp execute_like(target_type, target_id, user_id) do
    # Check if already liked
    if Social.has_liked?(user_id, target_type, target_id) do
      :ok
    else
      case Social.create_like(user_id, target_type, target_id) do
        {:ok, _like} -> :ok
        {:error, :already_liked} -> :ok
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp execute_repost(target_type, target_id, user_id) do
    case target_type do
      "Post" ->
        # Check if already reposted
        if Social.has_reposted?(user_id, "Post", target_id) do
          :ok
        else
          case Social.create_repost(user_id, target_id) do
            {:ok, _repost} -> :ok
            {:error, :already_reposted} -> :ok
            {:error, reason} -> {:error, reason}
          end
        end

      _ ->
        # Reposts only work for posts
        {:error, "Reposts only supported for Posts"}
    end
  end

  defp execute_comment(target_type, target_id, user_id, comment_text) do
    case target_type do
      type when type in ["Post", "Project"] ->
        case Content.create_comment(user_id, %{
               "commentable_type" => target_type,
               "commentable_id" => target_id,
               "content" => comment_text
             }) do
          {:ok, _comment} -> :ok
          {:error, reason} -> {:error, reason}
        end

      _ ->
        {:error, "Comments not supported for #{target_type}"}
    end
  end

  defp execute_follow(target_user_id, user_id) do
    # Don't follow self
    if target_user_id == user_id do
      :ok
    else
      # Check if already following
      if Social.is_following?(user_id, target_user_id) do
        :ok
      else
        case Social.follow(user_id, target_user_id) do
          {:ok, _follow} -> :ok
          {:error, reason} -> {:error, reason}
        end
      end
    end
  end

  defp execute_bookmark(target_type, target_id, user_id) do
    # Only bookmark posts and projects
    if target_type in ["Post", "Project"] do
      if Social.has_bookmarked?(user_id, target_type, target_id) do
        :ok
      else
        case Social.create_bookmark(user_id, target_type, target_id) do
          {:ok, _bookmark} -> :ok
          {:error, :already_bookmarked} -> :ok
          {:error, reason} -> {:error, reason}
        end
      end
    else
      {:error, "Bookmarks not supported for #{target_type}"}
    end
  end

  defp execute_quote(target_type, target_id, user_id, quote_text) do
    # Quote creates a new post that references the original
    case target_type do
      "Post" ->
        case Content.create_post(user_id, %{
               "content" => quote_text,
               "quoted_post_id" => target_id
             }) do
          {:ok, _post} -> :ok
          {:error, reason} -> {:error, reason}
        end

      "Project" ->
        case Content.create_post(user_id, %{
               "content" => quote_text,
               "quoted_project_id" => target_id
             }) do
          {:ok, _post} -> :ok
          {:error, reason} -> {:error, reason}
        end

      _ ->
        {:error, "Quotes not supported for #{target_type}"}
    end
  end
end
