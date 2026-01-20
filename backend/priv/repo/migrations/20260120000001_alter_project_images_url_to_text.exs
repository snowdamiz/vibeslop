defmodule Backend.Repo.Migrations.AlterProjectImagesUrlToText do
  use Ecto.Migration

  def change do
    alter table(:project_images) do
      modify :url, :text, from: :string
    end
  end
end
