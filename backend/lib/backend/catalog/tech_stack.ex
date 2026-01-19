defmodule Backend.Catalog.TechStack do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "tech_stacks" do
    field :name, :string
    field :slug, :string
    field :category, :string

    many_to_many :projects, Backend.Content.Project, join_through: "project_tech_stacks"

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(tech_stack, attrs) do
    tech_stack
    |> cast(attrs, [:name, :slug, :category])
    |> validate_required([:name, :slug])
    |> unique_constraint(:name)
    |> unique_constraint(:slug)
  end
end
