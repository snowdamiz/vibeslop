defmodule Backend.Repo.Migrations.AddGithubAccessTokenToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :github_access_token, :string
    end
  end
end
