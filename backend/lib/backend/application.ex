defmodule Backend.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

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
      # Start a worker by calling: Backend.Worker.start_link(arg)
      # {Backend.Worker, arg},
      # Start to serve requests, typically the last entry
      BackendWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Backend.Supervisor]
    Supervisor.start_link(children, opts)
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
end
