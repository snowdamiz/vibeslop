defmodule Backend.Repo.Migrations.CreateUserFavoriteTools do
  use Ecto.Migration

  def change do
    create table(:user_favorite_tools, primary_key: false) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :ai_tool_id, references(:ai_tools, type: :binary_id, on_delete: :delete_all), null: false
    end

    create unique_index(:user_favorite_tools, [:user_id, :ai_tool_id])
    create index(:user_favorite_tools, [:ai_tool_id])
  end
end
