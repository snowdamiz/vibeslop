defmodule Backend.AI.RateLimiter do
  @moduledoc """
  Rate limiting for AI generation features using Hammer.
  Prevents abuse and manages API costs.

  Free tier limits:
  - Text generation: 10 requests/hour
  - Image generation: 5 requests/hour

  Premium tier limits:
  - Text generation: 50 requests/hour
  - Image generation: 25 requests/hour

  Admin users have unlimited access.
  """

  alias Backend.Accounts
  alias Backend.Billing

  @doc """
  Checks if the user can perform AI text generation.
  Returns :ok if allowed, {:error, :rate_limited} if rate limit exceeded.
  Admin users always get :ok (unlimited).
  """
  def check_text_generation(user_id) do
    if is_admin?(user_id) do
      :ok
    else
      bucket = "ai_text:#{user_id}"
      scale = 60_000 * 60
      limit = get_text_limit(user_id)

      case Hammer.check_rate(bucket, scale, limit) do
        {:allow, _count} ->
          :ok

        {:deny, _limit} ->
          {:error, :rate_limited}
      end
    end
  end

  @doc """
  Checks if the user can perform AI image generation.
  Returns :ok if allowed, {:error, :rate_limited} if rate limit exceeded.
  Admin users always get :ok (unlimited).
  """
  def check_image_generation(user_id) do
    if is_admin?(user_id) do
      :ok
    else
      bucket = "ai_image:#{user_id}"
      scale = 60_000 * 60
      limit = get_image_limit(user_id)

      case Hammer.check_rate(bucket, scale, limit) do
        {:allow, _count} ->
          :ok

        {:deny, _limit} ->
          {:error, :rate_limited}
      end
    end
  end

  @doc """
  Gets the remaining quota for text generation for a user.
  Admin users get unlimited quota.
  """
  def get_text_quota(user_id) do
    if is_admin?(user_id) do
      {:ok, %{used: 0, remaining: :unlimited, limit: :unlimited}}
    else
      bucket = "ai_text:#{user_id}"
      scale = 60_000 * 60
      limit = get_text_limit(user_id)

      case Hammer.inspect_bucket(bucket, scale, limit) do
        {:ok, {count, _count_remaining, _ms_to_next_bucket, _created_at, _updated_at}} ->
          remaining = max(0, limit - count)
          {:ok, %{used: count, remaining: remaining, limit: limit}}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  @doc """
  Gets the remaining quota for image generation for a user.
  Admin users get unlimited quota.
  """
  def get_image_quota(user_id) do
    if is_admin?(user_id) do
      {:ok, %{used: 0, remaining: :unlimited, limit: :unlimited}}
    else
      bucket = "ai_image:#{user_id}"
      scale = 60_000 * 60
      limit = get_image_limit(user_id)

      case Hammer.inspect_bucket(bucket, scale, limit) do
        {:ok, {count, _count_remaining, _ms_to_next_bucket, _created_at, _updated_at}} ->
          remaining = max(0, limit - count)
          {:ok, %{used: count, remaining: remaining, limit: limit}}

        {:error, reason} ->
          {:error, reason}
      end
    end
  end

  # Private helper functions

  defp get_text_limit(user_id) do
    base = Application.get_env(:backend, Backend.AI)[:text_rate_limit_hourly] ||
      String.to_integer(System.get_env("AI_TEXT_RATE_LIMIT_HOURLY") || "10")

    if Billing.premium?(user_id), do: base * 5, else: base
  end

  defp get_image_limit(user_id) do
    base = Application.get_env(:backend, Backend.AI)[:image_rate_limit_hourly] ||
      String.to_integer(System.get_env("AI_IMAGE_RATE_LIMIT_HOURLY") || "5")

    if Billing.premium?(user_id), do: base * 5, else: base
  end

  defp is_admin?(user_id) do
    case Accounts.get_user(user_id) do
      nil -> false
      user -> Accounts.is_admin?(user)
    end
  end
end
