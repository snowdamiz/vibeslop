defmodule Backend.Engagement.Timing do
  @moduledoc """
  Module for generating human-like engagement timing patterns.

  Implements timing strategies that mimic natural human behavior:
  - Content age decay (fresh content gets more engagement)
  - Time-of-day weights (peak hours vs off-hours)
  - Random jitter on all scheduled times
  - Spread window based on intensity setting
  """

  @doc """
  Generates a list of scheduled times for engagements.

  Options:
  - `count` - Number of engagements to schedule
  - `intensity` - "low", "medium", or "high"
  - `content_created_at` - When the content was created (affects timing spread)
  - `multiplier` - Optional multiplier for curated content (e.g., 1.5, 2.0)
  """
  def generate_engagement_times(count, opts \\ []) do
    intensity = Keyword.get(opts, :intensity, "medium")
    content_created_at = Keyword.get(opts, :content_created_at, DateTime.utc_now())
    multiplier = Keyword.get(opts, :multiplier, 1.0)

    # Adjust count based on multiplier
    adjusted_count = max(0, round(count * multiplier))

    # Return empty list if no engagements to schedule
    if adjusted_count == 0 do
      []
    else
      generate_times_for_count(adjusted_count, intensity, content_created_at)
    end
  end

  defp generate_times_for_count(adjusted_count, intensity, content_created_at) do
    # Calculate spread window based on intensity
    spread_minutes = spread_window_minutes(intensity)

    # Get content age factor (fresh content gets faster engagement)
    age_factor = content_age_factor(content_created_at)

    # Adjust spread based on content age (fresh = tighter spread)
    adjusted_spread = round(spread_minutes * age_factor)

    # Generate timestamps with jitter
    now = DateTime.utc_now()

    1..adjusted_count
    |> Enum.map(fn i ->
      # Distribute engagements across the spread window
      # Earlier engagements happen sooner, later ones spread out
      base_offset = round((i / adjusted_count) * adjusted_spread)

      # Add time-of-day weight factor
      time_weight = time_of_day_weight(now, base_offset)
      weighted_offset = round(base_offset * time_weight)

      # Add random jitter (+/- 30 seconds to 2 minutes based on intensity)
      jitter = generate_jitter(intensity)

      # Calculate final scheduled time
      offset_seconds = (weighted_offset * 60) + jitter
      DateTime.add(now, offset_seconds, :second)
    end)
    |> Enum.sort(DateTime)
  end

  @doc """
  Calculates engagement counts based on intensity setting.

  Returns a map with counts for each engagement type.
  """
  def engagement_counts_for_intensity(intensity) do
    case intensity do
      "low" ->
        %{
          likes: Enum.random(3..8),
          reposts: Enum.random(0..2),
          comments: Enum.random(0..1),
          bookmarks: Enum.random(1..3),
          quotes: Enum.random(0..1)
        }

      "medium" ->
        %{
          likes: Enum.random(8..20),
          reposts: Enum.random(2..5),
          comments: Enum.random(1..3),
          bookmarks: Enum.random(2..6),
          quotes: Enum.random(0..2)
        }

      "high" ->
        %{
          likes: Enum.random(20..50),
          reposts: Enum.random(5..15),
          comments: Enum.random(3..8),
          bookmarks: Enum.random(5..12),
          quotes: Enum.random(1..4)
        }

      _ ->
        engagement_counts_for_intensity("medium")
    end
  end

  @doc """
  Returns the spread window in minutes based on intensity.
  """
  def spread_window_minutes(intensity) do
    case intensity do
      "low" -> Enum.random(120..240)
      "medium" -> Enum.random(60..120)
      "high" -> Enum.random(30..60)
      _ -> 90
    end
  end

  @doc """
  Calculates content age factor.

  Fresh content (<1h) gets 0.3x spread (faster engagement)
  Medium content (1-6h) gets 0.7x spread
  Older content (>6h) gets 1.0x spread (full spread)
  """
  def content_age_factor(content_created_at) do
    now = DateTime.utc_now()
    age_minutes = DateTime.diff(now, content_created_at, :minute)

    cond do
      age_minutes < 60 -> 0.3
      age_minutes < 360 -> 0.7
      true -> 1.0
    end
  end

  @doc """
  Calculates time-of-day weight factor.

  Peak hours (9-11, 14-16, 19-22 UTC) get 1.0x (normal)
  Off-peak hours get 1.3x (slower engagement)
  Night hours (0-6 UTC) get 1.8x (much slower)
  """
  def time_of_day_weight(base_time, offset_minutes) do
    # Calculate the hour when this engagement will happen
    scheduled_time = DateTime.add(base_time, offset_minutes * 60, :second)
    hour = scheduled_time.hour

    cond do
      hour in [9, 10, 11, 14, 15, 16, 19, 20, 21, 22] -> 1.0
      hour in [0, 1, 2, 3, 4, 5, 6] -> 1.8
      true -> 1.3
    end
  end

  @doc """
  Generates random jitter in seconds based on intensity.

  Low intensity: +/- 60-120 seconds
  Medium intensity: +/- 30-90 seconds
  High intensity: +/- 15-45 seconds
  """
  def generate_jitter(intensity) do
    {min_jitter, max_jitter} =
      case intensity do
        "low" -> {60, 120}
        "medium" -> {30, 90}
        "high" -> {15, 45}
        _ -> {30, 90}
      end

    jitter = Enum.random(min_jitter..max_jitter)

    # 50% chance of negative jitter
    if :rand.uniform() < 0.5, do: -jitter, else: jitter
  end

  @doc """
  Determines if an engagement should happen based on bot's engagement style weights.

  Returns true if a random roll is less than the weight for the engagement type.
  """
  def should_engage?(engagement_style, engagement_type) do
    weight_key = "#{engagement_type}_weight"
    weight = Map.get(engagement_style, weight_key, 0.5)
    :rand.uniform() < weight
  end

  @doc """
  Calculates delay before first engagement (anti-pattern detection).

  Returns seconds to wait before first engagement.
  """
  def initial_delay(intensity) do
    case intensity do
      "low" -> Enum.random(300..900)
      "medium" -> Enum.random(120..300)
      "high" -> Enum.random(30..120)
      _ -> Enum.random(120..300)
    end
  end

  @doc """
  Checks if the current time is within active hours for engagement.

  Returns true if current hour is in the "reasonable" activity window (7-23 UTC).
  """
  def within_activity_window? do
    hour = DateTime.utc_now().hour
    hour >= 7 and hour <= 23
  end

  @doc """
  Returns the next available engagement window start time.

  If currently outside activity window, returns the start of the next window.
  """
  def next_activity_window_start do
    now = DateTime.utc_now()

    if within_activity_window?() do
      now
    else
      # Calculate next 7:00 UTC
      today = DateTime.to_date(now)

      next_start =
        if now.hour > 23 do
          Date.add(today, 1)
        else
          today
        end

      DateTime.new!(next_start, ~T[07:00:00])
    end
  end
end
