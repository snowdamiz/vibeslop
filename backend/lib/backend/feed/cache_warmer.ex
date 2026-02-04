defmodule Backend.Feed.CacheWarmer do
  @moduledoc """
  Proactively warms the feed cache before TTL expires.

  This GenServer runs on an interval that's slightly shorter than the cache TTL,
  ensuring the cache is always warm for the most common request (first page, no filters).

  Benefits:
  - Users never hit a cold cache for the main feed
  - Reduces latency spikes from cache misses
  - Distributes query load more evenly over time
  """
  use GenServer

  require Logger

  alias Backend.Feed
  alias Backend.Feed.Cache

  # Warm cache at 80% of TTL to ensure it's always fresh
  # With 120s TTL, this means warming every 96 seconds
  @warm_interval_ratio 0.8

  # Delay before first warm to let app fully start
  @initial_delay_ms 15_000

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(opts) do
    GenServer.start_link(__MODULE__, opts, name: __MODULE__)
  end

  @doc """
  Manually trigger a cache warm. Useful for testing or after cache invalidation.
  """
  def warm_now do
    GenServer.cast(__MODULE__, :warm_now)
  end

  @doc """
  Returns the current warmer stats.
  """
  def stats do
    GenServer.call(__MODULE__, :stats)
  end

  # ============================================================================
  # GenServer Callbacks
  # ============================================================================

  @impl true
  def init(_opts) do
    # Schedule first warm after initial delay
    Process.send_after(self(), :warm, @initial_delay_ms)

    state = %{
      warms_count: 0,
      last_warm_at: nil,
      last_warm_duration_ms: nil,
      errors_count: 0
    }

    Logger.info("Feed cache warmer initialized, first warm in #{@initial_delay_ms}ms")

    {:ok, state}
  end

  @impl true
  def handle_cast(:warm_now, state) do
    new_state = do_warm(state)
    {:noreply, new_state}
  end

  @impl true
  def handle_call(:stats, _from, state) do
    {:reply, state, state}
  end

  @impl true
  def handle_info(:warm, state) do
    new_state = do_warm(state)

    # Schedule next warm
    schedule_next_warm()

    {:noreply, new_state}
  end

  @impl true
  def handle_info(_msg, state) do
    {:noreply, state}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp do_warm(state) do
    start_time = System.monotonic_time(:millisecond)

    try do
      # Warm the main for-you feed (first page, no filters)
      # This calls compute_for_you_items directly and caches the result
      cache_key = Cache.for_you_key([])

      if cache_key do
        # Force compute fresh data and cache it
        items = compute_feed_items()

        # Store in cache
        Cache.put(cache_key, items)

        duration_ms = System.monotonic_time(:millisecond) - start_time

        Logger.debug(
          "Feed cache warmed successfully in #{duration_ms}ms, #{length(items)} items cached"
        )

        %{
          state
          | warms_count: state.warms_count + 1,
            last_warm_at: DateTime.utc_now(),
            last_warm_duration_ms: duration_ms
        }
      else
        state
      end
    rescue
      error ->
        Logger.warning("Feed cache warm failed: #{inspect(error)}")

        %{state | errors_count: state.errors_count + 1}
    end
  end

  defp compute_feed_items do
    # Call the internal feed computation (bypassing cache check)
    # We access the private function through the public API with specific params
    # that trigger fresh computation
    result = Feed.for_you_feed(limit: 30, cursor: nil, current_user_id: nil)
    result.items
  end

  defp schedule_next_warm do
    ttl_ms = Cache.default_ttl() * 1000
    interval_ms = trunc(ttl_ms * @warm_interval_ratio)

    Process.send_after(self(), :warm, interval_ms)
  end
end
