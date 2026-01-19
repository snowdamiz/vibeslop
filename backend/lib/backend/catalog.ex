defmodule Backend.Catalog do
  @moduledoc """
  The Catalog context - handles reference data like AI tools and tech stacks.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Catalog.{AiTool, TechStack}

  ## AI Tools

  @doc """
  Returns the list of all AI tools.
  """
  def list_ai_tools do
    Repo.all(from t in AiTool, order_by: t.name)
  end

  @doc """
  Gets a single AI tool by ID.
  """
  def get_ai_tool!(id), do: Repo.get!(AiTool, id)

  @doc """
  Gets a single AI tool by slug.
  """
  def get_ai_tool_by_slug(slug) do
    Repo.get_by(AiTool, slug: slug)
  end

  ## Tech Stacks

  @doc """
  Returns the list of all tech stacks.
  """
  def list_tech_stacks do
    Repo.all(from t in TechStack, order_by: t.name)
  end

  @doc """
  Returns tech stacks grouped by category.
  """
  def list_tech_stacks_by_category do
    Repo.all(from t in TechStack, order_by: [t.category, t.name])
    |> Enum.group_by(& &1.category)
  end

  @doc """
  Gets a single tech stack by ID.
  """
  def get_tech_stack!(id), do: Repo.get!(TechStack, id)

  @doc """
  Gets a single tech stack by slug.
  """
  def get_tech_stack_by_slug(slug) do
    Repo.get_by(TechStack, slug: slug)
  end
end
