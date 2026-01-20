defmodule Backend.Content.PostMedia do
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "post_media" do
    field :url, :string  # Stores base64 data URI
    field :position, :integer, default: 0

    belongs_to :post, Backend.Content.Post

    timestamps(type: :utc_datetime, updated_at: false)
  end

  @doc false
  def changeset(post_media, attrs) do
    post_media
    |> cast(attrs, [:url, :position, :post_id])
    |> validate_required([:url, :post_id])
    |> foreign_key_constraint(:post_id)
  end
end
