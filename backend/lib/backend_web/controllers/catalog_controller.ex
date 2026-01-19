defmodule BackendWeb.CatalogController do
  use BackendWeb, :controller

  alias Backend.Catalog

  action_fallback BackendWeb.FallbackController

  def ai_tools(conn, _params) do
    tools = Catalog.list_ai_tools()

    json(conn, %{
      data: Enum.map(tools, fn tool ->
        %{
          id: tool.id,
          name: tool.name,
          slug: tool.slug,
          icon_url: tool.icon_url
        }
      end)
    })
  end

  def tech_stacks(conn, _params) do
    stacks = Catalog.list_tech_stacks()

    json(conn, %{
      data: Enum.map(stacks, fn stack ->
        %{
          id: stack.id,
          name: stack.name,
          slug: stack.slug,
          category: stack.category
        }
      end)
    })
  end
end
