defmodule Backend.Repo.Migrations.CreateOauthAccounts do
  use Ecto.Migration

  def change do
    create table(:oauth_accounts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :provider, :string, null: false
      add :provider_user_id, :string, null: false
      add :provider_email, :string
      add :access_token, :text
      add :refresh_token, :text
      add :expires_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:oauth_accounts, [:user_id])
    create unique_index(:oauth_accounts, [:provider, :provider_user_id])
  end
end
