defmodule Backend.Social.RateLimiter do
  @moduledoc """
  Rate limiting for social engagement features using Hammer.

  Protects against automated scripts creating thousands of engagements.
  """

  # Rate limits per hour
  @like_limit_hourly 200
  @repost_limit_hourly 50
  @bookmark_limit_hourly 100

  # Time window in milliseconds (1 hour)
  @hour_ms 60_000 * 60

  @doc """
  Checks if user can perform a like action.
  Returns :ok or {:error, :rate_limited}
  """
  def check_like(user_id) do
    check_rate("social:like:#{user_id}", @hour_ms, @like_limit_hourly)
  end

  @doc """
  Checks if user can perform a repost action.
  Returns :ok or {:error, :rate_limited}
  """
  def check_repost(user_id) do
    check_rate("social:repost:#{user_id}", @hour_ms, @repost_limit_hourly)
  end

  @doc """
  Checks if user can perform a bookmark action.
  Returns :ok or {:error, :rate_limited}
  """
  def check_bookmark(user_id) do
    check_rate("social:bookmark:#{user_id}", @hour_ms, @bookmark_limit_hourly)
  end

  @doc """
  Returns current rate limit status for a user's likes.
  Useful for debugging and monitoring.
  """
  def get_like_status(user_id) do
    get_status("social:like:#{user_id}", @hour_ms, @like_limit_hourly)
  end

  @doc """
  Returns current rate limit status for a user's reposts.
  """
  def get_repost_status(user_id) do
    get_status("social:repost:#{user_id}", @hour_ms, @repost_limit_hourly)
  end

  @doc """
  Returns current rate limit status for a user's bookmarks.
  """
  def get_bookmark_status(user_id) do
    get_status("social:bookmark:#{user_id}", @hour_ms, @bookmark_limit_hourly)
  end

  # ============================================================================
  # Private Functions
  # ============================================================================

  defp check_rate(bucket, scale, limit) do
    case Hammer.check_rate(bucket, scale, limit) do
      {:allow, _count} -> :ok
      {:deny, _limit} -> {:error, :rate_limited}
    end
  end

  defp get_status(bucket, scale, limit) do
    case Hammer.inspect_bucket(bucket, scale, limit) do
      {:ok, {count, _count_remaining, _ms_to_next_bucket, _created_at, _updated_at}} ->
        %{
          count: count,
          limit: limit,
          remaining: max(0, limit - count)
        }

      {:error, _} ->
        %{count: 0, limit: limit, remaining: limit}
    end
  end
end
