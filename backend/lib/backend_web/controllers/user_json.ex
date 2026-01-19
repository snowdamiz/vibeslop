defmodule BackendWeb.UserJSON do
  @doc """
  Renders a single user profile.
  """
  def show(%{user: user, stats: stats}) do
    %{
      data: %{
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        location: user.location,
        website_url: user.website_url,
        twitter_handle: user.twitter_handle,
        github_username: user.github_username,
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        is_verified: user.is_verified,
        joined_at: user.inserted_at,
        stats: stats
      }
    }
  end

  @doc """
  Renders a list of users.
  """
  def index(%{users: users}) do
    %{data: for(user <- users, do: user_summary(user))}
  end

  defp user_summary(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified
    }
  end
end
