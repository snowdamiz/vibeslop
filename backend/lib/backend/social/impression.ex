defmodule Backend.Social.Impression do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "impressions" do
    field :impressionable_type, :string
    field :impressionable_id, :binary_id
    field :fingerprint, :string
    field :ip_address, :string

    belongs_to :user, Backend.Accounts.User

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(impression, attrs) do
    impression
    |> cast(attrs, [:impressionable_type, :impressionable_id, :user_id, :fingerprint, :ip_address])
    |> validate_required([:impressionable_type, :impressionable_id])
    |> validate_inclusion(:impressionable_type, ["Post", "Project"])
    |> validate_at_least_one_identifier()
    |> foreign_key_constraint(:user_id)
    |> foreign_key_constraint(:impressionable_id)
    |> unique_constraint([:user_id, :impressionable_type, :impressionable_id],
      name: :impressions_user_unique_index,
      message: "has already been impressed"
    )
    |> unique_constraint([:fingerprint, :impressionable_type, :impressionable_id],
      name: :impressions_fingerprint_unique_index,
      message: "has already been impressed"
    )
  end

  defp validate_at_least_one_identifier(changeset) do
    user_id = get_field(changeset, :user_id)
    fingerprint = get_field(changeset, :fingerprint)

    if is_nil(user_id) and (is_nil(fingerprint) or fingerprint == "") do
      add_error(changeset, :base, "must have either user_id or fingerprint")
    else
      changeset
    end
  end
end
