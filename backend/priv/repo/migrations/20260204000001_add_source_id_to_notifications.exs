defmodule Backend.Repo.Migrations.AddSourceIdToNotifications do
  use Ecto.Migration

  def change do
    alter table(:notifications) do
      # For notifications like "quote" where clicking should navigate to a different
      # post than the target. e.g., for quotes: target_id is the original post,
      # source_id is the quote post that the user should be taken to.
      add :source_id, :binary_id
    end
  end
end
