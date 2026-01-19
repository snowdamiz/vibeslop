defmodule Backend.Content.ProjectTimelineEntry do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "project_timeline_entries" do
    field :date, :date
    field :title, :string
    field :description, :string
    field :display_order, :integer

    belongs_to :project, Backend.Content.Project

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(project_timeline_entry, attrs) do
    project_timeline_entry
    |> cast(attrs, [:date, :title, :description, :display_order, :project_id])
    |> validate_required([:date, :title, :project_id])
    |> validate_length(:title, min: 1, max: 200)
    |> foreign_key_constraint(:project_id)
  end
end
