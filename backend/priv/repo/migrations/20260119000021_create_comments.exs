defmodule Backend.Repo.Migrations.CreateComments do
  use Ecto.Migration

  def change do
    create table(:comments, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :commentable_type, :string, null: false
      add :commentable_id, :binary_id, null: false
      add :parent_id, references(:comments, type: :binary_id, on_delete: :delete_all)
      add :content, :text, null: false

      timestamps(type: :utc_datetime)
    end

    create index(:comments, [:user_id])
    create index(:comments, [:commentable_type, :commentable_id])
    create index(:comments, [:parent_id])
  end
end
