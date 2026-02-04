defmodule Backend.Bot.Workers.WeeklyTrendingWorker do
  @moduledoc """
  Oban worker that creates a weekly trending projects post.
  Runs every Monday at noon UTC.
  """

  use Oban.Worker, queue: :default

  alias Backend.Bot.TrendingPost

  require Logger

  @impl Oban.Worker
  def perform(_job) do
    Logger.info("Starting weekly trending projects post generation")

    case TrendingPost.generate() do
      {:ok, post} ->
        Logger.info("Successfully created trending projects post: #{post.id}")
        :ok

      {:error, :no_trending_projects} ->
        Logger.warning("No trending projects found, skipping weekly post")
        :ok

      {:error, reason} ->
        Logger.error("Failed to create trending projects post: #{inspect(reason)}")
        {:error, reason}
    end
  end
end
