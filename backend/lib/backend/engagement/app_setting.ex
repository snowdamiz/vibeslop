defmodule Backend.Engagement.AppSetting do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "app_settings" do
    field :key, :string
    field :value, :map, default: %{}
    field :description, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(app_setting, attrs) do
    app_setting
    |> cast(attrs, [:key, :value, :description])
    |> validate_required([:key])
    |> unique_constraint(:key)
  end
end
