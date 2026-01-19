defmodule Backend.Content.ProjectImage do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "project_images" do
    field :url, :string
    field :alt_text, :string
    field :display_order, :integer

    belongs_to :project, Backend.Content.Project

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(project_image, attrs) do
    project_image
    |> cast(attrs, [:url, :alt_text, :display_order, :project_id])
    |> validate_required([:url, :project_id])
    |> foreign_key_constraint(:project_id)
  end
end
