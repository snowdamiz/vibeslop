defmodule Backend.Bot.BotPost do
  @moduledoc """
  Schema for bot post metadata.
  Links a Post to bot-specific data like type and metadata.
  """
  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "bot_posts" do
    field :bot_type, :string
    field :metadata, :map, default: %{}

    belongs_to :post, Backend.Content.Post

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(bot_post, attrs) do
    bot_post
    |> cast(attrs, [:post_id, :bot_type, :metadata])
    |> validate_required([:post_id, :bot_type])
    |> validate_inclusion(:bot_type, ["trending_projects", "milestone", "announcement"])
    |> unique_constraint(:post_id)
  end
end
