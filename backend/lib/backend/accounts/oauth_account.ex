defmodule Backend.Accounts.OAuthAccount do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "oauth_accounts" do
    field :provider, :string
    field :provider_user_id, :string
    field :provider_email, :string
    field :access_token, :string
    field :refresh_token, :string
    field :expires_at, :utc_datetime

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(oauth_account, attrs) do
    oauth_account
    |> cast(attrs, [
      :provider,
      :provider_user_id,
      :provider_email,
      :access_token,
      :refresh_token,
      :expires_at,
      :user_id
    ])
    |> validate_required([:provider, :provider_user_id, :user_id])
    |> unique_constraint([:provider, :provider_user_id])
  end
end
