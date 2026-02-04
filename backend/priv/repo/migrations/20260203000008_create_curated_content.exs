defmodule Backend.Repo.Migrations.CreateCuratedContent do
  use Ecto.Migration

  def change do
    create table(:curated_content, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :content_type, :string, null: false
      add :content_id, :binary_id, null: false
      add :priority, :integer, default: 3
      add :engagement_multiplier, :float, default: 1.5
      add :added_by_id, references(:users, type: :binary_id, on_delete: :nilify_all)
      add :expires_at, :utc_datetime
      add :is_active, :boolean, default: true

      timestamps(type: :utc_datetime)
    end

    create unique_index(:curated_content, [:content_type, :content_id])
    create index(:curated_content, [:is_active])
    create index(:curated_content, [:expires_at])
    create index(:curated_content, [:priority])
  end
end
