defmodule Backend.AI.RateLimiter do
  @moduledoc """
  Rate limiting for AI generation features using Hammer.
  Prevents abuse and manages API costs.
  """

  @doc """
  Checks if the user can perform AI text generation.
  Limit: 10 requests per hour per user.

  Returns :ok if allowed, {:error, :rate_limited} if rate limit exceeded.
  """
  def check_text_generation(user_id) do
    bucket = "ai_text:#{user_id}"
    scale = 60_000 * 60  # 1 hour in milliseconds
    limit = get_text_limit()

    case Hammer.check_rate(bucket, scale, limit) do
      {:allow, _count} ->
        :ok

      {:deny, _limit} ->
        {:error, :rate_limited}
    end
  end

  @doc """
  Checks if the user can perform AI image generation.
  Limit: 5 requests per hour per user.

  Returns :ok if allowed, {:error, :rate_limited} if rate limit exceeded.
  """
  def check_image_generation(user_id) do
    bucket = "ai_image:#{user_id}"
    scale = 60_000 * 60  # 1 hour in milliseconds
    limit = get_image_limit()

    case Hammer.check_rate(bucket, scale, limit) do
      {:allow, _count} ->
        :ok

      {:deny, _limit} ->
        {:error, :rate_limited}
    end
  end

  @doc """
  Gets the remaining quota for text generation for a user.
  """
  def get_text_quota(user_id) do
    bucket = "ai_text:#{user_id}"
    scale = 60_000 * 60
    limit = get_text_limit()

    case Hammer.inspect_bucket(bucket, scale, limit) do
      {:ok, {count, _count_remaining, _ms_to_next_bucket, _created_at, _updated_at}} ->
        remaining = max(0, limit - count)
        {:ok, %{used: count, remaining: remaining, limit: limit}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Gets the remaining quota for image generation for a user.
  """
  def get_image_quota(user_id) do
    bucket = "ai_image:#{user_id}"
    scale = 60_000 * 60
    limit = get_image_limit()

    case Hammer.inspect_bucket(bucket, scale, limit) do
      {:ok, {count, _count_remaining, _ms_to_next_bucket, _created_at, _updated_at}} ->
        remaining = max(0, limit - count)
        {:ok, %{used: count, remaining: remaining, limit: limit}}

      {:error, reason} ->
        {:error, reason}
    end
  end

  # Private helper functions

  defp get_text_limit do
    Application.get_env(:backend, Backend.AI)[:text_rate_limit_hourly] ||
      String.to_integer(System.get_env("AI_TEXT_RATE_LIMIT_HOURLY") || "10")
  end

  defp get_image_limit do
    Application.get_env(:backend, Backend.AI)[:image_rate_limit_hourly] ||
      String.to_integer(System.get_env("AI_IMAGE_RATE_LIMIT_HOURLY") || "5")
  end
end
