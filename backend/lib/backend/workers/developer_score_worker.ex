defmodule Backend.Workers.DeveloperScoreWorker do
  @moduledoc """
  Oban worker that calculates and updates developer scores for all users
  with connected GitHub accounts.

  Runs daily at 3 AM UTC via cron schedule.
  Can also be triggered manually for a specific user.
  """

  use Oban.Worker,
    queue: :developer_scores,
    max_attempts: 3,
    # Prevent duplicate jobs within 1 hour
    unique: [period: 3600]

  require Logger

  alias Backend.Repo
  alias Backend.Accounts.User
  alias Backend.GitHub.Client
  alias Backend.DeveloperScore

  import Ecto.Query

  # Rate limiting: delay between processing users (in ms)
  @user_processing_delay 2000

  @impl Oban.Worker
  def perform(%Oban.Job{args: %{"user_id" => user_id}}) do
    # Single user update (can be triggered manually)
    case Repo.get(User, user_id) do
      nil ->
        Logger.warning("DeveloperScoreWorker: User #{user_id} not found")
        {:error, :user_not_found}

      user ->
        update_user_score(user)
    end
  end

  @impl Oban.Worker
  def perform(%Oban.Job{args: _args}) do
    # Batch update for all users with GitHub tokens
    Logger.info("DeveloperScoreWorker: Starting batch update")

    users = get_users_with_github()
    total = length(users)

    Logger.info("DeveloperScoreWorker: Found #{total} users with GitHub tokens")

    results =
      users
      |> Enum.with_index(1)
      |> Enum.map(fn {user, index} ->
        Logger.info("DeveloperScoreWorker: Processing user #{index}/#{total}: #{user.username}")

        result = update_user_score(user)

        # Rate limiting delay between users
        if index < total do
          Process.sleep(@user_processing_delay)
        end

        {user.id, result}
      end)

    successful = Enum.count(results, fn {_id, result} -> result == :ok end)
    failed = Enum.count(results, fn {_id, result} -> result != :ok end)

    Logger.info("DeveloperScoreWorker: Batch complete. Success: #{successful}, Failed: #{failed}")

    :ok
  end

  @doc """
  Enqueues a job to update a single user's developer score.
  """
  def enqueue_user(user_id) do
    %{user_id: user_id}
    |> new()
    |> Oban.insert()
  end

  @doc """
  Enqueues a batch job to update all users.
  """
  def enqueue_batch do
    %{}
    |> new()
    |> Oban.insert()
  end

  # =============================================================================
  # Private Functions
  # =============================================================================

  defp get_users_with_github do
    User
    |> where([u], not is_nil(u.github_access_token) and not is_nil(u.github_username))
    |> select([u], %{
      id: u.id,
      username: u.username,
      github_username: u.github_username,
      github_access_token: u.github_access_token
    })
    |> Repo.all()
  end

  defp update_user_score(user) do
    case fetch_and_calculate_score(user) do
      {:ok, score_data} ->
        save_user_score(user.id, score_data)

      {:error, reason} ->
        Logger.error("DeveloperScoreWorker: Failed for user #{user.username}: #{inspect(reason)}")
        {:error, reason}
    end
  end

  defp fetch_and_calculate_score(user) do
    case Client.get_developer_score_data(user.github_access_token, user.github_username) do
      {:ok, github_data} ->
        score_result = DeveloperScore.calculate(github_data)
        {:ok, score_result}

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp save_user_score(user_id, score_data) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Prepare github_stats map for storage
    github_stats = %{
      "score_breakdown" => score_data.breakdown,
      "commits_count" => score_data.stats.commits_count,
      "prs_count" => score_data.stats.prs_count,
      "prs_merged_count" => score_data.stats.prs_merged_count,
      "issues_count" => score_data.stats.issues_count,
      "public_repos" => score_data.stats.public_repos,
      "total_stars" => score_data.stats.total_stars,
      "total_forks" => score_data.stats.total_forks,
      "followers" => score_data.stats.followers,
      "languages" => score_data.stats.languages,
      "active_weeks" => score_data.stats.active_weeks,
      "current_streak" => score_data.stats.current_streak
    }

    case Repo.get(User, user_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        user
        |> User.developer_score_changeset(%{
          developer_score: score_data.score,
          developer_score_updated_at: now,
          github_stats: github_stats
        })
        |> Repo.update()
        |> case do
          {:ok, _user} ->
            Logger.info(
              "DeveloperScoreWorker: Updated score for user #{user.username}: #{score_data.score}"
            )

            :ok

          {:error, changeset} ->
            Logger.error(
              "DeveloperScoreWorker: Failed to save score for user #{user.username}: #{inspect(changeset.errors)}"
            )

            {:error, :save_failed}
        end
    end
  end
end
