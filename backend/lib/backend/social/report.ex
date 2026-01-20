defmodule Backend.Social.Report do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "reports" do
    field :reportable_type, :string
    field :reportable_id, :binary_id
    field :status, :string, default: "pending"

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(report, attrs) do
    report
    |> cast(attrs, [:reportable_type, :reportable_id, :status, :user_id])
    |> validate_required([:reportable_type, :reportable_id, :user_id])
    |> validate_inclusion(:reportable_type, ["Comment", "Post", "Project"])
    |> validate_inclusion(:status, ["pending", "reviewed", "resolved", "dismissed"])
    |> unique_constraint([:user_id, :reportable_type, :reportable_id])
    |> foreign_key_constraint(:user_id)
  end
end
