defmodule Backend.Repo.Migrations.AddImpressionCountToPosts do
  use Ecto.Migration

  def change do
    alter table(:posts) do
      add :impression_count, :integer, default: 0, null: false
    end
  end
end
