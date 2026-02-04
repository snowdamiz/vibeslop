defmodule Backend.Bot.TrendingPost do
  @moduledoc """
  Generates weekly trending projects bot posts.
  """

  alias Backend.Bot
  alias Backend.Recommendations

  @doc """
  Generates a trending projects post with the top 3 projects.

  ## Returns
  - {:ok, post} on success
  - {:error, reason} on failure
  """
  def generate do
    case Recommendations.trending_projects(limit: 2) do
      [] ->
        {:error, :no_trending_projects}

      trending_projects ->
        project_ids = Enum.map(trending_projects, & &1.project.id)
        content = build_content(trending_projects)

        Bot.create_bot_post("trending_projects", content, %{
          "project_ids" => project_ids
        })
    end
  end

  defp build_content(_trending_projects) do
    "This week's trending projects on Onvibe! Check them out and show some love to the creators."
  end
end
