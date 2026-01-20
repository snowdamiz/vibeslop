defmodule Backend.Accounts do
  @moduledoc """
  The Accounts context.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts.{User, OAuthAccount}
  alias Backend.Social.Follow

  @doc """
  Gets a single user by ID.
  """
  def get_user(id) do
    Repo.get(User, id)
  end

  @doc """
  Gets a user by email.
  """
  def get_user_by_email(email) do
    Repo.get_by(User, email: email)
  end

  @doc """
  Gets a user by username.
  """
  def get_user_by_username(username) do
    Repo.get_by(User, username: username)
  end

  @doc """
  Finds or creates a user from GitHub OAuth data.
  """
  def find_or_create_from_github(auth) do
    github_user_id = to_string(auth.uid)

    # Check if OAuth account exists
    case Repo.get_by(OAuthAccount, provider: "github", provider_user_id: github_user_id) do
      nil ->
        # Create new user and OAuth account
        create_user_from_github(auth)

      oauth_account ->
        # Update the access token for existing user
        oauth_account = Repo.preload(oauth_account, :user)
        user = oauth_account.user

        # Update user's GitHub access token
        case update_user(user, %{github_access_token: auth.credentials.token}) do
          {:ok, updated_user} -> {:ok, updated_user}
          {:error, _} -> {:ok, user}  # Return original user if update fails
        end
    end
  end

  defp create_user_from_github(auth) do
    info = auth.info

    # Extract user data from GitHub
    email = info.email || "#{auth.uid}@github.user"
    username = generate_unique_username(info.nickname || "user#{auth.uid}")
    display_name = info.name || username

    user_attrs = %{
      email: email,
      username: username,
      display_name: display_name,
      bio: info.description,
      location: info.location,
      avatar_url: info.image,
      github_username: info.nickname,
      github_access_token: auth.credentials.token
    }

    oauth_attrs = %{
      provider: "github",
      provider_user_id: to_string(auth.uid),
      provider_email: info.email,
      access_token: auth.credentials.token,
      refresh_token: auth.credentials.refresh_token,
      expires_at: auth.credentials.expires_at && DateTime.from_unix!(auth.credentials.expires_at)
    }

    # Create user and OAuth account in a transaction
    Repo.transaction(fn ->
      with {:ok, user} <- %User{} |> User.github_changeset(user_attrs) |> Repo.insert(),
           oauth_attrs <- Map.put(oauth_attrs, :user_id, user.id),
           {:ok, _oauth} <- %OAuthAccount{} |> OAuthAccount.changeset(oauth_attrs) |> Repo.insert() do
        user
      else
        {:error, changeset} -> Repo.rollback(changeset)
      end
    end)
  end

  defp generate_unique_username(base_username) do
    # Remove special characters and make lowercase
    base = base_username
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9_]/, "")

    case get_user_by_username(base) do
      nil -> base
      _user ->
        # Add random number if username exists
        random_suffix = :rand.uniform(9999)
        new_username = "#{base}#{random_suffix}"

        case get_user_by_username(new_username) do
          nil -> new_username
          _user -> generate_unique_username("#{base}#{:rand.uniform(99999)}")
        end
    end
  end

  @doc """
  Creates a user.
  """
  def create_user(attrs \\ %{}) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Updates a user.
  """
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Completes user onboarding with profile customization.
  """
  def complete_onboarding(%User{} = user, attrs) do
    user
    |> User.onboarding_changeset(attrs)
    |> Repo.update()
  end

  @doc """
  Checks if a username is available.
  Returns true if available, false if taken.
  Optionally excludes a user_id from the check.
  """
  def username_available?(username, exclude_user_id \\ nil) do
    query = from u in User, where: u.username == ^username

    query = if exclude_user_id do
      from u in query, where: u.id != ^exclude_user_id
    else
      query
    end

    Repo.one(query) == nil
  end

  @doc """
  Deletes a user.
  """
  def delete_user(%User{} = user) do
    Repo.delete(user)
  end

  @doc """
  Lists suggested users to follow.
  Returns users ordered by follower count, excluding the current user and users already followed.
  """
  def list_suggested_users(opts \\ []) do
    limit = Keyword.get(opts, :limit, 3)
    exclude_user_id = Keyword.get(opts, :exclude_user_id)

    # Start with base query - get users with their follower counts
    query =
      from u in User,
        left_join: f in Follow, on: f.following_id == u.id,
        group_by: u.id,
        order_by: [desc: count(f.id), desc: u.inserted_at],
        limit: ^limit,
        select: u

    # Exclude the current user if provided
    query = if exclude_user_id do
      from u in query, where: u.id != ^exclude_user_id
    else
      query
    end

    # Exclude users already followed by current user
    query = if exclude_user_id do
      from u in query,
        where: u.id not in subquery(
          from f in Follow,
            where: f.follower_id == ^exclude_user_id,
            select: f.following_id
        )
    else
      query
    end

    Repo.all(query)
  end

  @doc """
  Searches for users by username or display name.
  """
  def search_users(query_string, opts \\ []) do
    limit = Keyword.get(opts, :limit, 10)
    exclude_user_id = Keyword.get(opts, :exclude_user_id)

    search_pattern = "%#{query_string}%"

    query =
      from u in User,
        where: ilike(u.username, ^search_pattern) or ilike(u.display_name, ^search_pattern),
        order_by: [asc: u.username],
        limit: ^limit,
        select: u

    # Exclude the current user if provided
    query = if exclude_user_id do
      from u in query, where: u.id != ^exclude_user_id
    else
      query
    end

    Repo.all(query)
  end
end
