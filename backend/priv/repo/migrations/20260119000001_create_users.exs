defmodule Backend.Repo.Migrations.CreateUsers do
  use Ecto.Migration

  def change do
    create table(:users, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :email, :string, null: false
      add :username, :string, null: false
      add :display_name, :string, null: false
      add :bio, :text
      add :location, :string
      add :website_url, :string
      add :twitter_handle, :string
      add :github_username, :string
      add :avatar_url, :string
      add :banner_url, :string
      add :is_verified, :boolean, default: false, null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:users, [:email])
    create unique_index(:users, [:username])
  end
end
