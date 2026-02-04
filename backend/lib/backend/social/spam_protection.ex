defmodule Backend.Social.SpamProtection do
  @moduledoc """
  Spam protection for social engagement features.

  Protects against fake account farming by requiring minimum account age
  for engagement actions.
  """

  # Minimum account age in hours for general engagement (likes, bookmarks)
  @min_age_hours 1

  # Reposts require older account (since they have higher weight in algorithm)
  @min_age_for_repost_hours 24

  @doc """
  Checks if a user's account is old enough to perform an engagement action.
  Returns :ok or {:error, :account_too_new}

  ## Examples

      iex> can_engage?(user, :like)
      :ok

      iex> can_engage?(new_user, :repost)
      {:error, :account_too_new}
  """
  def can_engage?(user, action_type) do
    min_age = get_min_age(action_type)
    age_hours = get_account_age_hours(user)

    if age_hours >= min_age do
      :ok
    else
      {:error, :account_too_new}
    end
  end

  @doc """
  Returns the required minimum account age in hours for an action type.
  """
  def get_min_age(:repost), do: @min_age_for_repost_hours
  def get_min_age(_action_type), do: @min_age_hours

  @doc """
  Returns the account age in hours.
  """
  def get_account_age_hours(user) do
    DateTime.diff(DateTime.utc_now(), user.inserted_at, :hour)
  end

  @doc """
  Returns how many hours until the account can perform an action.
  Returns 0 if already allowed.
  """
  def hours_until_allowed(user, action_type) do
    min_age = get_min_age(action_type)
    age_hours = get_account_age_hours(user)

    if age_hours >= min_age do
      0
    else
      min_age - age_hours
    end
  end
end
