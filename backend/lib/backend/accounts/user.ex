defmodule Backend.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :username, :string
    field :display_name, :string
    field :bio, :string
    field :location, :string
    field :website_url, :string
    field :twitter_handle, :string
    field :github_username, :string
    field :avatar_url, :string
    field :banner_url, :string
    field :is_verified, :boolean, default: false

    has_many :oauth_accounts, Backend.Accounts.OAuthAccount
    has_many :posts, Backend.Content.Post
    has_many :projects, Backend.Content.Project
    has_many :comments, Backend.Content.Comment
    has_many :likes, Backend.Social.Like
    has_many :follower_relationships, Backend.Social.Follow, foreign_key: :following_id
    has_many :following_relationships, Backend.Social.Follow, foreign_key: :follower_id

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :username,
      :display_name,
      :bio,
      :location,
      :website_url,
      :twitter_handle,
      :github_username,
      :avatar_url,
      :banner_url,
      :is_verified
    ])
    |> validate_required([:email, :username, :display_name])
    |> validate_format(:email, ~r/^[^\s]+@[^\s]+$/, message: "must be a valid email")
    |> unique_constraint(:email)
    |> unique_constraint(:username)
  end

  @doc """
  Changeset for creating a user from GitHub OAuth data
  """
  def github_changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :username,
      :display_name,
      :bio,
      :location,
      :website_url,
      :twitter_handle,
      :github_username,
      :avatar_url
    ])
    |> validate_required([:email, :username, :display_name])
    |> unique_constraint(:email)
    |> unique_constraint(:username)
  end
end
