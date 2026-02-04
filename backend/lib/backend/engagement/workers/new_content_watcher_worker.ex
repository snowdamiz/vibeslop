defmodule Backend.Engagement.Workers.NewContentWatcherWorker do
  @moduledoc """
  Oban worker that watches for new content (posts and projects) and schedules
  simulated engagement for them.

  Runs every 2-3 minutes via cron to detect newly created content
  and trigger the engagement scheduling process.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 120]

  import Ecto.Query

  alias Backend.Repo
  alias Backend.Content.{Post, Project}
  alias Backend.Engagement
  alias Backend.Engagement.Workers.EngagementSchedulerWorker

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{args: args}) do
    # Check if engagement system is enabled
    if Engagement.engagement_enabled?() do
      Logger.info("NewContentWatcherWorker: Starting content scan")

      # Get time window for new content (last scan + buffer)
      # Default to 5 minutes if no last_scan provided
      last_scan =
        case Map.get(args, "last_scan") do
          nil -> DateTime.add(DateTime.utc_now(), -5 * 60, :second)
          timestamp -> DateTime.from_iso8601(timestamp) |> elem(1)
        end

      # Find new posts
      new_posts = find_new_posts(last_scan)
      Logger.info("NewContentWatcherWorker: Found #{length(new_posts)} new posts")

      # Find new projects
      new_projects = find_new_projects(last_scan)
      Logger.info("NewContentWatcherWorker: Found #{length(new_projects)} new projects")

      # Schedule engagement for each piece of content
      scheduled_count =
        Enum.map(new_posts, fn post ->
          schedule_engagement("Post", post.id, post.user_id, post.inserted_at)
        end)
        |> Enum.concat(
          Enum.map(new_projects, fn project ->
            schedule_engagement("Project", project.id, project.user_id, project.inserted_at)
          end)
        )
        |> Enum.filter(fn result -> result == :ok end)
        |> length()

      Logger.info("NewContentWatcherWorker: Scheduled engagement for #{scheduled_count} items")

      :ok
    else
      Logger.debug("NewContentWatcherWorker: Engagement system is disabled")
      :ok
    end
  end

  # Find posts created since last scan, excluding bot posts
  defp find_new_posts(since) do
    from(p in Post,
      join: u in assoc(p, :user),
      where: p.inserted_at > ^since,
      where: u.is_system_bot == false,
      order_by: [asc: p.inserted_at],
      limit: 100,
      select: %{id: p.id, user_id: p.user_id, inserted_at: p.inserted_at}
    )
    |> Repo.all()
  end

  # Find projects created since last scan, excluding bot projects
  defp find_new_projects(since) do
    from(p in Project,
      join: u in assoc(p, :user),
      where: p.inserted_at > ^since,
      where: u.is_system_bot == false,
      order_by: [asc: p.inserted_at],
      limit: 100,
      select: %{id: p.id, user_id: p.user_id, inserted_at: p.inserted_at}
    )
    |> Repo.all()
  end

  # Schedule engagement for a piece of content
  defp schedule_engagement(content_type, content_id, author_id, created_at) do
    # Check for curated content multiplier
    curated = Engagement.get_curated_content(content_type, content_id)

    multiplier =
      if curated do
        curated.engagement_multiplier
      else
        1.0
      end

    args = %{
      "content_type" => content_type,
      "content_id" => content_id,
      "author_id" => author_id,
      "created_at" => DateTime.to_iso8601(created_at),
      "multiplier" => multiplier
    }

    case EngagementSchedulerWorker.new(args) |> Oban.insert() do
      {:ok, _job} ->
        Logger.debug("Scheduled engagement for #{content_type} #{content_id}")
        :ok

      {:error, reason} ->
        Logger.error("Failed to schedule engagement: #{inspect(reason)}")
        :error
    end
  end

  @doc """
  Manually trigger a content scan. Useful for testing or manual runs.
  """
  def trigger_scan do
    %{} |> new() |> Oban.insert()
  end
end
