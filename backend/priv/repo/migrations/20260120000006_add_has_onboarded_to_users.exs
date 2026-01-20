defmodule Backend.Repo.Migrations.AddHasOnboardedToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :has_onboarded, :boolean, default: false, null: false
    end
  end
end
