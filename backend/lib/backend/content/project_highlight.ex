defmodule Backend.Content.ProjectHighlight do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "project_highlights" do
    field :content, :string
    field :display_order, :integer

    belongs_to :project, Backend.Content.Project

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(project_highlight, attrs) do
    project_highlight
    |> cast(attrs, [:content, :display_order, :project_id])
    |> validate_required([:content, :project_id])
    |> validate_length(:content, min: 1, max: 500)
    |> foreign_key_constraint(:project_id)
  end
end
