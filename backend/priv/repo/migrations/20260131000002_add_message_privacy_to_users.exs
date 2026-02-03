defmodule Backend.Repo.Migrations.AddMessagePrivacyToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :message_privacy, :string, default: "everyone", null: false
    end
  end
end
