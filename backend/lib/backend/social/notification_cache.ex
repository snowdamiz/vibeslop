defmodule Backend.Social.NotificationCache do
  @moduledoc """
  ETS-based caching for notification unread counts.

  Caches unread notification count per user with a short TTL.
  Invalidated when notifications are created or marked as read.
  """
  use GenServer

  require Logger

  # Cache TTL in seconds - short since unread counts change frequently
  @cache_ttl_seconds 30

  # ETS table name
  @table_name :notification_cache

  # ============================================================================
  # Client API
  # ============================================================================

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @doc """
  Gets the cached unread count for a user, or computes it if not cached.
  """
  def get_unread_count(user_id, compute_fn) do
    cache_key = unread_count_key(user_id)
    now = System.system_time(:second)

    case :ets.lookup(@table_name, cache_key) do
      [{^cache_key, count, expires_at}] when expires_at > now ->
        count

      _ ->
        count = compute_fn.()
        :ets.insert(@table_name, {cache_key, count, now + @cache_ttl_seconds})
        count
    end
  end

  @doc """
  Invalidates the unread count cache for a user.
  Call this when:
  - A new notification is created for the user
  - A notification is marked as read
  - All notifications are marked as read
  """
  def invalidate_unread_count(user_id) do
    cache_key = unread_count_key(user_id)
    :ets.delete(@table_name, cache_key)
    :ok
  end

  @doc """
  Increments the cached unread count by 1 (for new notifications).
  If not cached, does nothing (will be computed fresh on next read).
  """
  def increment_unread_count(user_id) do
    cache_key = unread_count_key(user_id)
    now = System.system_time(:second)

    case :ets.lookup(@table_name, cache_key) do
      [{^cache_key, count, expires_at}] when expires_at > now ->
        :ets.insert(@table_name, {cache_key, count + 1, expires_at})
        :ok

      _ ->
        # Not cached, will be computed fresh on next read
        :ok
    end
  end

  @doc """
  Decrements the cached unread count by 1 (for marking as read).
  If not cached, does nothing (will be computed fresh on next read).
  """
  def decrement_unread_count(user_id) do
    cache_key = unread_count_key(user_id)
    now = System.system_time(:second)

    case :ets.lookup(@table_name, cache_key) do
      [{^cache_key, count, expires_at}] when expires_at > now and count > 0 ->
        :ets.insert(@table_name, {cache_key, count - 1, expires_at})
        :ok

      _ ->
        # Not cached or already 0, will be computed fresh on next read
        :ok
    end
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

    Logger.info("Notification cache initialized with #{@cache_ttl_seconds}s TTL")

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

  defp unread_count_key(user_id) do
    "unread:#{user_id}"
  end

  defp schedule_cleanup do
    # Run cleanup every 2 minutes
    Process.send_after(self(), :cleanup, 2 * 60 * 1000)
  end

  defp cleanup_expired do
    now = System.system_time(:second)

    # Select and delete expired entries
    match_spec = [{{:"$1", :_, :"$2"}, [{:"=<", :"$2", now}], [:"$1"]}]

    expired_keys = :ets.select(@table_name, match_spec)
    Enum.each(expired_keys, fn key -> :ets.delete(@table_name, key) end)

    if length(expired_keys) > 0 do
      Logger.debug("Notification cache cleanup: removed #{length(expired_keys)} expired entries")
    end
  end
end
