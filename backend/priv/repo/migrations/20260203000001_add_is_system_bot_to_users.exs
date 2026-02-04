defmodule Backend.Repo.Migrations.AddIsSystemBotToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :is_system_bot, :boolean, default: false, null: false
    end
  end
end
