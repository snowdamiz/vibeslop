defmodule Backend.Content.ProjectPrompt do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "project_prompts" do
    field :title, :string
    field :description, :string
    field :code, :string
    field :position, :integer

    belongs_to :project, Backend.Content.Project

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(project_prompt, attrs) do
    project_prompt
    |> cast(attrs, [:title, :description, :code, :position, :project_id])
    |> validate_required([:title, :code, :project_id])
    |> validate_length(:title, min: 1, max: 200)
    |> foreign_key_constraint(:project_id)
  end
end
