defmodule Backend.Repo.Migrations.CreateUserSpecializations do
  use Ecto.Migration

  def change do
    create table(:user_specializations, primary_key: false) do
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      add :specialization_id,
          references(:specializations, type: :binary_id, on_delete: :delete_all), null: false
    end

    create unique_index(:user_specializations, [:user_id, :specialization_id])
    create index(:user_specializations, [:specialization_id])
  end
end
