defmodule Backend.Catalog.AiTool do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "ai_tools" do
    field :name, :string
    field :slug, :string
    field :icon_url, :string

    many_to_many :projects, Backend.Content.Project, join_through: "project_ai_tools"

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(ai_tool, attrs) do
    ai_tool
    |> cast(attrs, [:name, :slug, :icon_url])
    |> validate_required([:name, :slug])
    |> unique_constraint(:name)
    |> unique_constraint(:slug)
  end
end
