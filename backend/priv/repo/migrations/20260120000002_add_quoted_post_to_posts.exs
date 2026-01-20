defmodule Backend.Repo.Migrations.AddQuotedPostToPosts do
  use Ecto.Migration

  def change do
    alter table(:posts) do
      add :quoted_post_id, references(:posts, type: :binary_id, on_delete: :nilify_all)
      add :quoted_project_id, references(:projects, type: :binary_id, on_delete: :nilify_all)
    end

    create index(:posts, [:quoted_post_id])
    create index(:posts, [:quoted_project_id])
  end
end
