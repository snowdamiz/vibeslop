defmodule Backend.DeveloperScore do
  @moduledoc """
  Calculates developer scores based on GitHub activity data.

  The scoring algorithm incorporates:
  - Time decay: Recent activity is worth more than old activity
  - Consistency bonus: Sustained activity over time is rewarded
  - Quality factors: Merged PRs worth more, active repos worth more
  - Language diversity: Using multiple languages shows breadth
  """

  # Base points for each activity type
  @base_points %{
    commit: 1,
    pull_request: 5,
    pull_request_merged: 8,
    issue: 2,
    repo: 10,
    star_received: 3,
    fork_received: 5,
    follower: 2
  }

  # Time decay parameter (lambda)
  # 0.005 gives ~50% value at 140 days, ~16% at 1 year
  @decay_lambda 0.005

  @doc """
  Calculates the developer score from GitHub data.

  Returns a map with:
  - score: The total developer score (integer)
  - breakdown: Points breakdown by category
  - stats: Raw statistics used in calculation
  """
  def calculate(github_data) do
    # Calculate time-decayed activity scores
    commits_score = calculate_commits_score(github_data.commits)
    prs_score = calculate_prs_score(github_data.pull_requests)
    issues_score = calculate_issues_score(github_data.issues)

    # Repository score with freshness multiplier
    repos_score = calculate_repos_score(github_data.repos)

    # Static scores (cumulative achievements, no decay)
    stars_score = (github_data.total_stars || 0) * @base_points.star_received
    forks_score = (github_data.total_forks || 0) * @base_points.fork_received
    followers_score = (github_data.followers || 0) * @base_points.follower

    # Bonuses
    all_activity_dates = collect_activity_dates(github_data)
    consistency_score = calculate_consistency_bonus(all_activity_dates)
    diversity_score = calculate_language_diversity_bonus(github_data.languages)

    # Total score
    total_score =
      round(
        commits_score + prs_score + issues_score + repos_score +
          stars_score + forks_score + followers_score +
          consistency_score + diversity_score
      )

    # Prepare breakdown for transparency
    breakdown = %{
      commits: round(commits_score),
      pull_requests: round(prs_score),
      issues: round(issues_score),
      repos: round(repos_score),
      stars: stars_score,
      forks: forks_score,
      followers: followers_score,
      consistency: consistency_score,
      language_diversity: diversity_score
    }

    # Raw stats
    stats = %{
      commits_count: length(github_data.commits || []),
      prs_count: length(github_data.pull_requests || []),
      prs_merged_count: count_merged_prs(github_data.pull_requests),
      issues_count: length(github_data.issues || []),
      public_repos: length(github_data.repos || []),
      total_stars: github_data.total_stars || 0,
      total_forks: github_data.total_forks || 0,
      followers: github_data.followers || 0,
      languages: github_data.languages || [],
      active_weeks: count_active_weeks(all_activity_dates),
      current_streak: calculate_current_streak(all_activity_dates)
    }

    %{
      score: total_score,
      breakdown: breakdown,
      stats: stats
    }
  end

  # =============================================================================
  # Time Decay
  # =============================================================================

  @doc """
  Calculates time decay factor for an activity.
  decay_factor = e^(-lambda * days_ago)
  """
  def time_decay(days_ago) when is_number(days_ago) and days_ago >= 0 do
    :math.exp(-@decay_lambda * days_ago)
  end

  def time_decay(_), do: 1.0

  defp days_ago(nil), do: 0

  defp days_ago(date_string) when is_binary(date_string) do
    case DateTime.from_iso8601(date_string) do
      {:ok, datetime, _} ->
        DateTime.diff(DateTime.utc_now(), datetime, :day)

      _ ->
        0
    end
  end

  defp days_ago(%DateTime{} = datetime) do
    DateTime.diff(DateTime.utc_now(), datetime, :day)
  end

  defp days_ago(_), do: 0

  # =============================================================================
  # Commit Scoring
  # =============================================================================

  defp calculate_commits_score(nil), do: 0

  defp calculate_commits_score(commits) when is_list(commits) do
    commits
    |> Enum.map(fn commit ->
      date =
        get_in(commit, ["commit", "author", "date"]) || commit["created_at"] ||
          commit[:created_at]

      @base_points.commit * time_decay(days_ago(date))
    end)
    |> Enum.sum()
  end

  defp calculate_commits_score(_), do: 0

  # =============================================================================
  # PR Scoring
  # =============================================================================

  defp calculate_prs_score(nil), do: 0

  defp calculate_prs_score(prs) when is_list(prs) do
    prs
    |> Enum.map(fn pr ->
      merged_at = pr["merged_at"] || pr[:merged_at]
      created_at = pr["created_at"] || pr[:created_at]

      # Merged PRs are worth more
      base = if merged_at, do: @base_points.pull_request_merged, else: @base_points.pull_request

      base * time_decay(days_ago(created_at))
    end)
    |> Enum.sum()
  end

  defp calculate_prs_score(_), do: 0

  defp count_merged_prs(nil), do: 0

  defp count_merged_prs(prs) when is_list(prs) do
    Enum.count(prs, fn pr ->
      merged_at = pr["merged_at"] || pr[:merged_at]
      not is_nil(merged_at)
    end)
  end

  defp count_merged_prs(_), do: 0

  # =============================================================================
  # Issue Scoring
  # =============================================================================

  defp calculate_issues_score(nil), do: 0

  defp calculate_issues_score(issues) when is_list(issues) do
    issues
    |> Enum.map(fn issue ->
      created_at = issue["created_at"] || issue[:created_at]
      @base_points.issue * time_decay(days_ago(created_at))
    end)
    |> Enum.sum()
  end

  defp calculate_issues_score(_), do: 0

  # =============================================================================
  # Repository Scoring with Freshness
  # =============================================================================

  defp calculate_repos_score(nil), do: 0

  defp calculate_repos_score(repos) when is_list(repos) do
    repos
    |> Enum.map(fn repo ->
      pushed_at = repo["pushed_at"] || repo[:pushed_at]
      @base_points.repo * repo_freshness_multiplier(pushed_at)
    end)
    |> Enum.sum()
  end

  defp calculate_repos_score(_), do: 0

  defp repo_freshness_multiplier(nil), do: 0.25

  defp repo_freshness_multiplier(pushed_at) do
    days_since_push = days_ago(pushed_at)

    cond do
      # Pushed this week
      days_since_push <= 7 -> 1.5
      # Pushed this month
      days_since_push <= 30 -> 1.25
      # Pushed this quarter
      days_since_push <= 90 -> 1.0
      # Pushed this year
      days_since_push <= 365 -> 0.5
      # Stale (>1 year)
      true -> 0.25
    end
  end

  # =============================================================================
  # Consistency Bonus
  # =============================================================================

  defp calculate_consistency_bonus(activity_dates) when is_list(activity_dates) do
    active_weeks = count_active_weeks(activity_dates)
    current_streak = calculate_current_streak(activity_dates)

    # Base bonus: +2 points per active week
    base_bonus = active_weeks * 2

    # Streak multiplier
    streak_multiplier = calculate_streak_multiplier(current_streak)

    round(base_bonus * streak_multiplier)
  end

  defp calculate_consistency_bonus(_), do: 0

  defp calculate_streak_multiplier(streak_weeks) do
    cond do
      # 1+ year streak
      streak_weeks >= 52 -> 2.0
      # 6+ month streak
      streak_weeks >= 26 -> 1.5
      # 3+ month streak
      streak_weeks >= 12 -> 1.25
      # 1+ month streak
      streak_weeks >= 4 -> 1.1
      true -> 1.0
    end
  end

  defp count_active_weeks(activity_dates) when is_list(activity_dates) do
    one_year_ago = Date.utc_today() |> Date.add(-365)

    activity_dates
    |> Enum.map(&parse_date/1)
    |> Enum.reject(&is_nil/1)
    |> Enum.filter(&(Date.compare(&1, one_year_ago) != :lt))
    |> Enum.map(&Date.to_iso8601/1)
    |> Enum.map(&week_number/1)
    |> Enum.uniq()
    |> length()
  end

  defp count_active_weeks(_), do: 0

  defp calculate_current_streak(activity_dates) when is_list(activity_dates) do
    today = Date.utc_today()

    # Get unique weeks with activity, sorted descending
    active_week_numbers =
      activity_dates
      |> Enum.map(&parse_date/1)
      |> Enum.reject(&is_nil/1)
      |> Enum.map(&week_number/1)
      |> Enum.uniq()
      |> Enum.sort(:desc)

    current_week = week_number(Date.to_iso8601(today))

    # Count consecutive weeks from current week
    count_consecutive_weeks(active_week_numbers, current_week, 0)
  end

  defp calculate_current_streak(_), do: 0

  defp count_consecutive_weeks([], _expected_week, count), do: count

  defp count_consecutive_weeks([week | rest], expected_week, count) do
    cond do
      week == expected_week ->
        count_consecutive_weeks(rest, expected_week - 1, count + 1)

      week == expected_week - 1 ->
        # Allow one week gap (in case we're at the start of a new week)
        count_consecutive_weeks([week | rest], expected_week - 1, count)

      true ->
        count
    end
  end

  defp week_number(date_string) when is_binary(date_string) do
    case Date.from_iso8601(String.slice(date_string, 0, 10)) do
      {:ok, date} ->
        {year, week} = :calendar.iso_week_number({date.year, date.month, date.day})
        year * 100 + week

      _ ->
        0
    end
  end

  defp week_number(_), do: 0

  # =============================================================================
  # Language Diversity Bonus
  # =============================================================================

  defp calculate_language_diversity_bonus(nil), do: 0

  defp calculate_language_diversity_bonus(languages) when is_list(languages) do
    language_count = length(languages)

    cond do
      # Polyglot
      language_count >= 10 -> 100
      # Versatile
      language_count >= 5 -> 50
      # Multi-skilled
      language_count >= 3 -> 20
      true -> 0
    end
  end

  defp calculate_language_diversity_bonus(_), do: 0

  # =============================================================================
  # Helper Functions
  # =============================================================================

  defp collect_activity_dates(github_data) do
    commit_dates =
      (github_data.commits || [])
      |> Enum.map(fn c ->
        get_in(c, ["commit", "author", "date"]) || c["created_at"] || c[:created_at]
      end)

    pr_dates =
      (github_data.pull_requests || [])
      |> Enum.map(fn pr -> pr["created_at"] || pr[:created_at] end)

    issue_dates =
      (github_data.issues || [])
      |> Enum.map(fn i -> i["created_at"] || i[:created_at] end)

    commit_dates ++ pr_dates ++ issue_dates
  end

  defp parse_date(nil), do: nil

  defp parse_date(date_string) when is_binary(date_string) do
    case DateTime.from_iso8601(date_string) do
      {:ok, datetime, _} ->
        DateTime.to_date(datetime)

      _ ->
        case Date.from_iso8601(String.slice(date_string, 0, 10)) do
          {:ok, date} -> date
          _ -> nil
        end
    end
  end

  defp parse_date(%Date{} = date), do: date
  defp parse_date(%DateTime{} = datetime), do: DateTime.to_date(datetime)
  defp parse_date(_), do: nil
end
