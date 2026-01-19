defmodule Backend.Repo.Migrations.CreateProjects do
  use Ecto.Migration

  def change do
    create table(:projects, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :title, :string, null: false
      add :description, :text, null: false
      add :long_description, :text
      add :status, :string, default: "draft", null: false
      add :live_url, :string
      add :github_url, :string
      add :view_count, :integer, default: 0, null: false
      add :published_at, :utc_datetime

      timestamps(type: :utc_datetime)
    end

    create index(:projects, [:user_id])
    create index(:projects, [:status])
    create index(:projects, [:published_at])
  end
end
