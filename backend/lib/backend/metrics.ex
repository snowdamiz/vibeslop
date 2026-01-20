defmodule Backend.Metrics do
  @moduledoc """
  The Metrics context - handles engagement counters and trend tracking.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.{Post, Project}
  alias Backend.Social.EngagementHourly

  @doc """
  Increments a counter field on a post or project.
  Counter types: :likes_count, :comments_count, :reposts_count, :bookmarks_count, :quotes_count, :impression_count
  """
  def increment_counter(content_type, content_id, counter_field) when is_atom(counter_field) do
    case content_type do
      "Post" ->
        from(p in Post, where: p.id == ^content_id)
        |> Repo.update_all(inc: [{counter_field, 1}])

      "Project" ->
        # For impressions on projects, use view_count instead
        field = if counter_field == :impression_count, do: :view_count, else: counter_field
        from(p in Project, where: p.id == ^content_id)
        |> Repo.update_all(inc: [{field, 1}])

      _ ->
        {:error, :invalid_content_type}
    end
  end

  @doc """
  Decrements a counter field on a post or project.
  Counter types: :likes_count, :comments_count, :reposts_count, :bookmarks_count, :quotes_count
  """
  def decrement_counter(content_type, content_id, counter_field) when is_atom(counter_field) do
    case content_type do
      "Post" ->
        from(p in Post, where: p.id == ^content_id)
        |> Repo.update_all(inc: [{counter_field, -1}])

      "Project" ->
        from(p in Project, where: p.id == ^content_id)
        |> Repo.update_all(inc: [{counter_field, -1}])

      _ ->
        {:error, :invalid_content_type}
    end
  end

  @valid_engagement_types ~w(likes comments reposts bookmarks quotes impressions)a

  @doc """
  Records an engagement event in the hourly aggregation table.
  Engagement types: :likes, :comments, :reposts, :bookmarks, :quotes, :impressions
  Uses upsert to atomically insert or update, avoiding race conditions.
  """
  def record_hourly_engagement(content_type, content_id, engagement_type, opts \\ [])
      when engagement_type in @valid_engagement_types do
    increment_by = Keyword.get(opts, :increment_by, 1)
    timestamp = Keyword.get(opts, :timestamp, DateTime.utc_now())

    # Truncate to hour bucket
    hour_bucket =
      DateTime.truncate(timestamp, :second)
      |> Map.put(:minute, 0)
      |> Map.put(:second, 0)
      |> Map.put(:microsecond, {0, 0})

    # Convert atom to string for SQL column name (validated by guard clause)
    column = Atom.to_string(engagement_type)

    # Convert UUIDs to binary format for Postgrex
    {:ok, id_binary} = Ecto.UUID.dump(Ecto.UUID.generate())
    {:ok, content_id_binary} = Ecto.UUID.dump(content_id)

    # Use raw SQL upsert for atomic increment
    # This avoids race conditions and transaction failures
    sql = """
    INSERT INTO engagement_hourly (id, content_type, content_id, hour_bucket, #{column}, inserted_at)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (content_type, content_id, hour_bucket)
    DO UPDATE SET #{column} = engagement_hourly.#{column} + $5
    """

    case Repo.query(sql, [
      id_binary,
      content_type,
      content_id_binary,
      hour_bucket,
      increment_by,
      DateTime.utc_now()
    ]) do
      {:ok, _result} -> {:ok, :recorded}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc """
  Gets trending posts based on recent engagement velocity.
  Returns posts with highest engagement in the specified time window (in hours).
  """
  def get_trending_posts(hours \\ 24, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cutoff = DateTime.utc_now() |> DateTime.add(-hours, :hour)

    query =
      from e in EngagementHourly,
        where: e.content_type == "Post" and e.hour_bucket >= ^cutoff,
        group_by: e.content_id,
        select: %{
          post_id: e.content_id,
          total_engagement: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)
        },
        order_by: [desc: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)],
        limit: ^limit

    Repo.all(query)
  end

  @doc """
  Gets trending projects based on recent engagement velocity.
  Returns projects with highest engagement in the specified time window (in hours).
  """
  def get_trending_projects(hours \\ 24, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    cutoff = DateTime.utc_now() |> DateTime.add(-hours, :hour)

    query =
      from e in EngagementHourly,
        where: e.content_type == "Project" and e.hour_bucket >= ^cutoff,
        group_by: e.content_id,
        select: %{
          project_id: e.content_id,
          total_engagement: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)
        },
        order_by: [desc: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)],
        limit: ^limit

    Repo.all(query)
  end

  @doc """
  Calculates the engagement velocity for a specific piece of content.
  Returns a map with recent_engagement and older_engagement counts for comparison.
  """
  def get_engagement_velocity(content_type, content_id, opts \\ []) do
    recent_hours = Keyword.get(opts, :recent_hours, 6)
    comparison_hours = Keyword.get(opts, :comparison_hours, 24)

    recent_cutoff = DateTime.utc_now() |> DateTime.add(-recent_hours, :hour)
    older_cutoff = DateTime.utc_now() |> DateTime.add(-comparison_hours, :hour)

    # Get recent engagement (last N hours)
    recent_query =
      from e in EngagementHourly,
        where: e.content_type == ^content_type and
               e.content_id == ^content_id and
               e.hour_bucket >= ^recent_cutoff,
        select: %{
          total: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)
        }

    # Get older engagement (between comparison_hours and recent_hours ago)
    older_query =
      from e in EngagementHourly,
        where: e.content_type == ^content_type and
               e.content_id == ^content_id and
               e.hour_bucket >= ^older_cutoff and
               e.hour_bucket < ^recent_cutoff,
        select: %{
          total: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions)
        }

    recent_result = Repo.one(recent_query)
    older_result = Repo.one(older_query)

    recent_engagement = if recent_result, do: recent_result.total || 0, else: 0
    older_engagement = if older_result, do: older_result.total || 0, else: 0

    %{
      recent_engagement: recent_engagement,
      older_engagement: older_engagement,
      velocity: calculate_velocity_ratio(recent_engagement, older_engagement, recent_hours, comparison_hours - recent_hours)
    }
  end

  defp calculate_velocity_ratio(recent, older, recent_hours, older_hours) do
    # Normalize by time window to get rate per hour
    recent_rate = if recent_hours > 0, do: recent / recent_hours, else: 0
    older_rate = if older_hours > 0, do: older / older_hours, else: 0

    # Calculate velocity as ratio (>1 means accelerating, <1 means decelerating)
    if older_rate > 0 do
      recent_rate / older_rate
    else
      if recent_rate > 0, do: :infinity, else: 0
    end
  end

  @doc """
  Gets hot content (combination of total engagement and velocity).
  Uses a weighted score: total_engagement * velocity_multiplier.
  """
  def get_hot_posts(opts \\ []) do
    hours = Keyword.get(opts, :hours, 24)
    limit = Keyword.get(opts, :limit, 50)
    velocity_weight = Keyword.get(opts, :velocity_weight, 2.0)

    cutoff = DateTime.utc_now() |> DateTime.add(-hours, :hour)
    recent_cutoff = DateTime.utc_now() |> DateTime.add(-6, :hour)

    query =
      from e in EngagementHourly,
        where: e.content_type == "Post" and e.hour_bucket >= ^cutoff,
        group_by: e.content_id,
        select: %{
          post_id: e.content_id,
          total_engagement: sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions),
          recent_engagement: fragment(
            "SUM(CASE WHEN ? >= ? THEN ? + ? + ? + ? ELSE 0 END)",
            e.hour_bucket,
            ^recent_cutoff,
            e.likes,
            e.comments,
            e.reposts,
            e.impressions
          )
        },
        order_by: [
          desc: fragment(
            "? * ?",
            sum(e.likes) + sum(e.comments) + sum(e.reposts) + sum(e.impressions),
            ^velocity_weight
          )
        ],
        limit: ^limit

    Repo.all(query)
  end
end
