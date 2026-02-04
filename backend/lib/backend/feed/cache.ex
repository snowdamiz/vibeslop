defmodule Backend.Feed.Cache do
  @moduledoc """
  ETS-based caching for feed results.

  Caches the first page of the for-you feed (no cursor) with a 60-second TTL.
  This dramatically reduces database load for the most common feed request.
  """
  use GenServer

  require Logger

  # Cache TTL in seconds (increased from 60 to 120 for better performance)
  @cache_ttl_seconds 120

  # ETS table name
  @table_name :feed_cache

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Gets a cached value or computes it if not present/expired.

  ## Parameters
  - cache_key: A unique key for this cache entry (e.g., "for_you:no_cursor")
  - compute_fn: A function that computes the value if not cached

  ## Returns
  - {:cached, result} if the value was found in cache
  - {:computed, result} if the value was computed fresh
  """
  def get_or_compute(cache_key, compute_fn) do
    now = System.system_time(:second)

    case :ets.lookup(@table_name, cache_key) do
      [{^cache_key, result, expires_at}] when expires_at > now ->
        {:cached, result}

      _ ->
        result = compute_fn.()
        :ets.insert(@table_name, {cache_key, result, now + @cache_ttl_seconds})
        {:computed, result}
    end
  end

  @doc """
  Gets a cached value without computing if not present.

  Returns `{:ok, value}` if found and not expired, `:miss` otherwise.
  """
  def get(cache_key) do
    now = System.system_time(:second)

    case :ets.lookup(@table_name, cache_key) do
      [{^cache_key, result, expires_at}] when expires_at > now ->
        {:ok, result}

      _ ->
        :miss
    end
  end

  @doc """
  Puts a value in the cache with the default TTL.
  """
  def put(cache_key, value) do
    put(cache_key, value, @cache_ttl_seconds)
  end

  @doc """
  Puts a value in the cache with a custom TTL.
  """
  def put(cache_key, value, ttl_seconds) do
    now = System.system_time(:second)
    :ets.insert(@table_name, {cache_key, value, now + ttl_seconds})
    :ok
  end

  @doc """
  Invalidates a specific cache key.
  """
  def invalidate(cache_key) do
    :ets.delete(@table_name, cache_key)
    :ok
  end

  @doc """
  Invalidates all cache entries matching a pattern.
  Uses a prefix match for efficiency.
  """
  def invalidate_prefix(prefix) do
    # Use select_delete for efficient prefix-based deletion
    match_spec = [{{:"$1", :_, :_}, [{:is_binary, :"$1"}], [true]}]

    :ets.select(@table_name, match_spec)
    |> Enum.filter(fn key -> String.starts_with?(key, prefix) end)
    |> Enum.each(fn key -> :ets.delete(@table_name, key) end)

    :ok
  end

  @doc """
  Clears all cache entries.
  """
  def clear do
    :ets.delete_all_objects(@table_name)
    :ok
  end

  @doc """
  Returns cache statistics.
  """
  def stats do
    info = :ets.info(@table_name)

    %{
      size: Keyword.get(info, :size, 0),
      memory_bytes: Keyword.get(info, :memory, 0) * :erlang.system_info(:wordsize)
    }
  end

  @doc """
  Returns the default cache TTL in seconds.
  """
  def default_ttl, do: @cache_ttl_seconds

  # ============================================================================
  # Cache Key Builders
  # ============================================================================

  @doc """
  Builds a cache key for the for-you feed.
  Only the first page (no cursor) is cached.
  """
  def for_you_key(opts \\ []) do
    ai_tool_ids = Keyword.get(opts, :ai_tool_ids, []) |> Enum.sort()
    tech_stack_ids = Keyword.get(opts, :tech_stack_ids, []) |> Enum.sort()

    # Only cache when no cursor and no filters for simplicity
    if ai_tool_ids == [] and tech_stack_ids == [] do
      "for_you:first_page"
    else
      # Don't cache filtered feeds (too many variants)
      nil
    end
  end

  # ============================================================================
  # GenServer Callbacks
  # ============================================================================

  @impl true
  def init(_) do
    # Create ETS table owned by this process
    table = :ets.new(@table_name, [
      :named_table,
      :public,
      :set,
      read_concurrency: true,
      write_concurrency: true
    ])

    # Schedule periodic cleanup of expired entries
    schedule_cleanup()

    Logger.info("Feed cache initialized with #{@cache_ttl_seconds}s TTL")

    {:ok, %{table: table}}
  end

  @impl true
  def handle_info(:cleanup, state) do
    cleanup_expired()
    schedule_cleanup()
    {:noreply, state}
  end

  @impl true
  def handle_info(_msg, state) do
    {:noreply, state}
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp schedule_cleanup do
    # Run cleanup every 5 minutes
    Process.send_after(self(), :cleanup, 5 * 60 * 1000)
  end

  defp cleanup_expired do
    now = System.system_time(:second)

    # Select and delete expired entries
    # Match spec: {key, value, expires_at} where expires_at <= now
    match_spec = [{{:"$1", :_, :"$2"}, [{:"=<", :"$2", now}], [:"$1"]}]

    expired_keys = :ets.select(@table_name, match_spec)
    Enum.each(expired_keys, fn key -> :ets.delete(@table_name, key) end)

    if length(expired_keys) > 0 do
      Logger.debug("Feed cache cleanup: removed #{length(expired_keys)} expired entries")
    end
  end
end
