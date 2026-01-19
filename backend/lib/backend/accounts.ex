defmodule Backend.Accounts do
  @moduledoc """
  The Accounts context.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts.{User, OAuthAccount}

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
        # Return existing user
        oauth_account = Repo.preload(oauth_account, :user)
        {:ok, oauth_account.user}
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
      github_username: info.nickname
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
  Deletes a user.
  """
  def delete_user(%User{} = user) do
    Repo.delete(user)
  end
end
