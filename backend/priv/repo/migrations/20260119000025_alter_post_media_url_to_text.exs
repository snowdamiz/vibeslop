defmodule Backend.Repo.Migrations.AlterPostMediaUrlToText do
  use Ecto.Migration

  def change do
    alter table(:post_media) do
      modify :url, :text, from: :string
    end
  end
end
