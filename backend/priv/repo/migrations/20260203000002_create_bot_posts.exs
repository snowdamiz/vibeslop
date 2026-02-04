defmodule Backend.Repo.Migrations.CreateBotPosts do
  use Ecto.Migration

  def change do
    create table(:bot_posts, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :post_id, references(:posts, type: :binary_id, on_delete: :delete_all), null: false
      add :bot_type, :string, null: false
      add :metadata, :map, default: %{}

      timestamps(type: :utc_datetime)
    end

    create unique_index(:bot_posts, [:post_id])
    create index(:bot_posts, [:bot_type])
  end
end
