defmodule Backend.Engagement.Workers.BotPostWorker do
  @moduledoc """
  Oban worker that creates text posts for bot users.

  Runs periodically to have bots create new posts, making them appear
  as active members of the community who share thoughts and updates.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 1800]

  alias Backend.Repo
  alias Backend.Engagement
  alias Backend.Engagement.BotPostGenerator
  alias Backend.Content

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    # Check if engagement system is enabled
    unless Engagement.engagement_enabled?() do
      Logger.debug("BotPostWorker: Engagement system disabled, skipping")
      return(:ok)
    end

    # Check if bot posts are enabled
    unless Engagement.bot_posts_enabled?() do
      Logger.debug("BotPostWorker: Bot posts disabled, skipping")
      return(:ok)
    end

    # Get the target bot or select one randomly
    bot_user =
      case Map.get(args, "bot_user_id") do
        nil -> select_bot_for_post()
        bot_id -> Engagement.get_bot_user(bot_id) |> Repo.preload(:user)
      end

    unless bot_user do
      Logger.debug("BotPostWorker: No eligible bot found for posting")
      return(:ok)
    end

    Logger.info("BotPostWorker: Creating post for bot #{bot_user.user.username}")

    # Generate post content (always returns {:ok, ...} with fallback)
    {:ok, post_attrs} = BotPostGenerator.generate_post(bot_user)
    create_bot_post(bot_user, post_attrs)
  end

  defp return(value), do: value

  defp select_bot_for_post do
    # Select an active bot that:
    # - Is active
    # - Hasn't posted recently (within last few hours based on persona)
    # - Prefers enthusiast and casual personas (they post more)

    import Ecto.Query

    # Different personas post at different frequencies
    hours_since_last_post = 4
    time_threshold = DateTime.utc_now() |> DateTime.add(-hours_since_last_post, :hour)

    # Get bots that are eligible
    eligible_bots =
      from(b in Engagement.EngagementBotUser,
        join: u in assoc(b, :user),
        where: b.is_active == true,
        where: b.persona_type in ["enthusiast", "casual", "supportive"],
        preload: [user: u]
      )
      |> Repo.all()

    # Filter out bots that posted recently
    eligible_bots
    |> Enum.filter(fn bot ->
      recent_post_count =
        from(p in Backend.Content.Post,
          where: p.user_id == ^bot.user_id,
          where: p.inserted_at > ^time_threshold
        )
        |> Repo.aggregate(:count)

      recent_post_count == 0
    end)
    |> Enum.shuffle()
    |> List.first()
  end

  defp create_bot_post(bot_user, post_attrs) do
    case Content.create_post(bot_user.user_id, %{
           "content" => post_attrs.content
         }) do
      {:ok, post} ->
        Logger.info(
          "BotPostWorker: Created post for bot #{bot_user.user.username}: #{String.slice(post.content, 0, 50)}..."
        )

        # Schedule engagement for this new post from other bots
        schedule_post_engagement(post, bot_user)

        :ok

      {:error, reason} ->
        Logger.error("BotPostWorker: Failed to create post: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp schedule_post_engagement(post, creator_bot) do
    # Schedule other bots to engage with this post
    # Use reduced engagement to not make it too obvious
    Engagement.Workers.EngagementSchedulerWorker.new(%{
      "content_type" => "Post",
      "content_id" => post.id,
      "author_id" => creator_bot.user_id,
      "created_at" => DateTime.to_iso8601(post.inserted_at),
      "multiplier" => 0.5
    })
    |> Oban.insert()
  end

  @doc """
  Manually trigger a bot post creation. Useful for testing.
  """
  def trigger_post(bot_user_id \\ nil) do
    args = if bot_user_id, do: %{"bot_user_id" => bot_user_id}, else: %{}
    args |> new() |> Oban.insert()
  end
end
