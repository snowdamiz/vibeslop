defmodule Backend.Engagement.Workers.BotProjectWorker do
  @moduledoc """
  Oban worker that creates projects for bot users.

  Runs periodically to have bots create new projects, making them appear
  as active members of the community rather than just engagement accounts.

  Projects are created without external URLs (no GitHub, no live demo) to
  avoid exposing bots when users try to visit those links.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 3600]

  alias Backend.Repo
  alias Backend.Engagement
  alias Backend.Engagement.BotProjectGenerator
  alias Backend.Content

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    # Check if engagement system is enabled
    unless Engagement.engagement_enabled?() do
      Logger.debug("BotProjectWorker: Engagement system disabled, skipping")
      return(:ok)
    end

    # Check if bot projects are enabled
    unless Engagement.bot_projects_enabled?() do
      Logger.debug("BotProjectWorker: Bot projects disabled, skipping")
      return(:ok)
    end

    # Get the target bot or select one randomly
    bot_user =
      case Map.get(args, "bot_user_id") do
        nil -> select_bot_for_project()
        bot_id -> Engagement.get_bot_user(bot_id) |> Repo.preload(:user)
      end

    unless bot_user do
      Logger.debug("BotProjectWorker: No eligible bot found for project creation")
      return(:ok)
    end

    Logger.info("BotProjectWorker: Creating project for bot #{bot_user.user.username}")

    # Generate project content (always returns {:ok, ...} with fallback)
    {:ok, project_attrs} = BotProjectGenerator.generate_project(bot_user)
    create_bot_project(bot_user, project_attrs)
  end

  defp return(value), do: value

  defp select_bot_for_project do
    # Select an active bot that:
    # - Has been active for at least a day
    # - Hasn't posted a project recently (within last 7 days)
    # - Prefers enthusiast or casual personas (they post more)

    import Ecto.Query

    seven_days_ago = DateTime.utc_now() |> DateTime.add(-7, :day)
    one_day_ago = DateTime.utc_now() |> DateTime.add(-1, :day)

    # Get bots that are eligible
    eligible_bots =
      from(b in Engagement.EngagementBotUser,
        join: u in assoc(b, :user),
        where: b.is_active == true,
        where: b.inserted_at < ^one_day_ago,
        where: b.persona_type in ["enthusiast", "casual", "supportive"],
        preload: [user: u]
      )
      |> Repo.all()

    # Filter out bots that posted recently
    eligible_bots
    |> Enum.filter(fn bot ->
      recent_project_count =
        from(p in Backend.Content.Project,
          where: p.user_id == ^bot.user_id,
          where: p.inserted_at > ^seven_days_ago
        )
        |> Repo.aggregate(:count)

      recent_project_count == 0
    end)
    |> Enum.shuffle()
    |> List.first()
  end

  defp create_bot_project(bot_user, project_attrs) do
    # Build the attrs map for Content.create_project
    attrs = %{
      "title" => project_attrs.title,
      "description" => project_attrs.description,
      "highlights" => project_attrs.highlights || [],
      "tools" => project_attrs[:ai_tool_names] || [],
      "stack" => project_attrs[:tech_stack_names] || [],
      "links" => %{},  # No external links for bots
      "images" => [],  # TODO: Could add placeholder images later
      "timeline" => []
    }

    case Content.create_project(bot_user.user_id, attrs) do
      {:ok, project} ->
        Logger.info("BotProjectWorker: Created project '#{project.title}' for bot #{bot_user.user.username}")

        # Update the project with long_description if present
        if project_attrs[:long_description] do
          project
          |> Ecto.Changeset.change(%{long_description: project_attrs.long_description})
          |> Repo.update()
        end

        # Schedule engagement for this new project from other bots
        schedule_project_engagement(project, bot_user)

        :ok

      {:error, reason} ->
        Logger.error("BotProjectWorker: Failed to create project: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp schedule_project_engagement(project, creator_bot) do
    # Schedule other bots to engage with this project
    # Use reduced engagement to not make it too obvious
    Engagement.Workers.EngagementSchedulerWorker.new(%{
      "content_type" => "Project",
      "content_id" => project.id,
      "author_id" => creator_bot.user_id,
      "created_at" => DateTime.to_iso8601(project.published_at || DateTime.utc_now()),
      "multiplier" => 0.5  # Half the normal engagement for bot-created content
    })
    |> Oban.insert()
  end

  @doc """
  Manually trigger a bot project creation. Useful for testing.
  """
  def trigger_project(bot_user_id \\ nil) do
    args = if bot_user_id, do: %{"bot_user_id" => bot_user_id}, else: %{}
    args |> new() |> Oban.insert()
  end
end
