defmodule Backend.Engagement.Workers.DailyResetWorker do
  @moduledoc """
  Oban worker that resets daily engagement counters for all bots.

  Runs at midnight UTC via cron to reset the engagements_today counter
  for all engagement bot users.
  """

  use Oban.Worker,
    queue: :engagement,
    max_attempts: 3,
    unique: [period: 3600]

  alias Backend.Engagement

  require Logger

  @impl Oban.Worker
  def perform(%Oban.Job{}) do
    Logger.info("DailyResetWorker: Starting daily engagement counter reset")

    {:ok, count} = Engagement.reset_daily_engagement_counters()
    Logger.info("DailyResetWorker: Successfully reset counters for #{count} bots")
    :ok
  end

  @doc """
  Manually trigger a daily reset. Useful for testing.
  """
  def trigger_reset do
    %{} |> new() |> Oban.insert()
  end
end
