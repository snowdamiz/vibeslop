defmodule Backend.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  # Capture Mix.env at compile time since Mix isn't available in releases
  @env Mix.env()

  @impl true
  def start(_type, _args) do
    # Run migrations automatically in development
    if Application.get_env(:backend, :auto_migrate, false) do
      migrate()
    end

    children = [
      BackendWeb.Telemetry,
      Backend.Repo,
      {DNSCluster, query: Application.get_env(:backend, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Backend.PubSub},
      # AI image cache for tracking AI-generated images
      Backend.AI.ImageCache,
      # Feed cache for caching first page of for-you feed
      Backend.Feed.Cache,
      # Oban for background job processing
      {Oban, Application.fetch_env!(:backend, Oban)},
      # Start to serve requests, typically the last entry
      BackendWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Backend.Supervisor]
    result = Supervisor.start_link(children, opts)

    # Schedule initial developer score calculation after startup
    schedule_initial_score_calculation()

    result
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    BackendWeb.Endpoint.config_change(changed, removed)
    :ok
  end

  defp migrate do
    # Use with_repo to temporarily start the repo for migrations
    {:ok, _, _} =
      Ecto.Migrator.with_repo(Backend.Repo, fn repo ->
        Ecto.Migrator.run(repo, :up, all: true)
      end)
  rescue
    # If migrations fail (e.g., database doesn't exist), log and continue
    error ->
      require Logger
      Logger.warning("Auto-migration failed: #{inspect(error)}. Run 'mix ecto.setup' manually.")
  end

  defp schedule_initial_score_calculation do
    # Only run in dev and prod, not in test
    unless @env == :test do
      # Schedule developer score calculation 10 seconds after startup
      # This gives the app time to fully initialize
      Task.start(fn ->
        Process.sleep(10_000)

        require Logger
        Logger.info("Running initial developer score calculation...")

        case Backend.Workers.DeveloperScoreWorker.enqueue_batch() do
          {:ok, _job} ->
            Logger.info("Initial developer score calculation job enqueued successfully")

          {:error, reason} ->
            Logger.warning(
              "Failed to enqueue initial developer score calculation: #{inspect(reason)}"
            )
        end
      end)
    end
  end
end
