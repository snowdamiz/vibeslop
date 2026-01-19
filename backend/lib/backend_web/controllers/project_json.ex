defmodule BackendWeb.ProjectJSON do
  @doc """
  Renders a list of projects.
  """
  def index(%{projects: projects}) do
    %{data: for(project_data <- projects, do: data(project_data))}
  end

  @doc """
  Renders a single project.
  """
  def show(%{project: project_data}) do
    %{data: detail(project_data)}
  end

  defp data(%{project: project} = project_data) do
    user = project.user

    %{
      id: project.id,
      type: "project",
      title: project.title,
      description: project.description,
      image: get_first_image(project),
      likes: Map.get(project_data, :likes_count, 0),
      comments: Map.get(project_data, :comments_count, 0),
      reposts: 0,
      created_at: project.published_at || project.inserted_at,
      tools: Enum.map(project.ai_tools || [], & &1.name),
      stack: Enum.map(project.tech_stacks || [], & &1.name),
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      }
    }
  end

  defp detail(%{project: project} = project_data) do
    user = project.user

    %{
      id: project.id,
      title: project.title,
      description: project.description,
      long_description: project.long_description,
      status: project.status,
      live_url: project.live_url,
      github_url: project.github_url,
      view_count: project.view_count,
      likes: Map.get(project_data, :likes_count, 0),
      comments: Map.get(project_data, :comments_count, 0),
      created_at: project.published_at || project.inserted_at,
      images: Enum.map(project.images || [], fn img ->
        %{id: img.id, url: img.url, alt_text: img.alt_text}
      end),
      highlights: Enum.map(project.highlights || [], fn h ->
        %{id: h.id, content: h.content}
      end),
      prompts: Enum.map(project.prompts || [], fn p ->
        %{id: p.id, title: p.title, description: p.description, code: p.prompt_text}
      end),
      timeline: Enum.map(project.timeline_entries || [], fn t ->
        %{id: t.id, date: t.date, title: t.title, description: t.description}
      end),
      ai_tools: Enum.map(project.ai_tools || [], fn t ->
        %{id: t.id, name: t.name, slug: t.slug}
      end),
      tech_stack: Enum.map(project.tech_stacks || [], fn t ->
        %{id: t.id, name: t.name, slug: t.slug, category: t.category}
      end),
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        bio: user.bio,
        is_verified: user.is_verified
      }
    }
  end

  defp get_first_image(%{images: [first | _]}), do: first.url
  defp get_first_image(_), do: nil

  defp get_initials(name) do
    name
    |> String.split(" ")
    |> Enum.take(2)
    |> Enum.map(&String.first/1)
    |> Enum.join("")
    |> String.upcase()
  end
end
