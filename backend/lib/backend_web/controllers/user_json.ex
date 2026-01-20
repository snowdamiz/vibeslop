defmodule BackendWeb.UserJSON do
  @doc """
  Renders a single user profile.
  """
  def show(%{user: user, stats: stats}) do
    %{
      data: %{
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        bio: user.bio,
        location: user.location,
        website_url: user.website_url,
        twitter_handle: user.twitter_handle,
        github_username: user.github_username,
        avatar_url: user.avatar_url,
        banner_url: user.banner_url,
        is_verified: user.is_verified,
        joined_at: format_datetime(user.inserted_at),
        stats: stats
      }
    }
  end

  @doc """
  Renders a list of users or liked items (posts and projects).
  """
  def index(%{users: users}) do
    %{data: for(user <- users, do: user_summary(user))}
  end

  def index(%{items: items}) do
    %{data: for(item <- items, do: render_liked_item(item))}
  end

  defp user_summary(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      bio: user.bio,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified
    }
  end

  # Render liked post
  defp render_liked_item(%{post: post, user: user} = item) do
    media = case post.media do
      %Ecto.Association.NotLoaded{} -> []
      nil -> []
      media_list -> Enum.map(media_list, & &1.url)
    end

    %{
      id: post.id,
      type: "update",
      content: post.content,
      likes: Map.get(item, :likes_count, 0),
      comments: Map.get(item, :comments_count, 0),
      reposts: Map.get(item, :reposts_count, 0),
      created_at: format_datetime(post.inserted_at),
      media: media,
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      },
      project: nil
    }
  end

  # Render liked project
  defp render_liked_item(%{project: project} = item) do
    user = project.user

    %{
      id: project.id,
      type: "project",
      title: project.title,
      description: project.description,
      image: get_first_image(project),
      likes: Map.get(item, :likes_count, 0),
      comments: Map.get(item, :comments_count, 0),
      reposts: Map.get(item, :reposts_count, 0),
      created_at: format_datetime(project.published_at || project.inserted_at),
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

  # Format DateTime to ISO 8601 with Z suffix for proper JS parsing
  defp format_datetime(nil), do: nil
  defp format_datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp format_datetime(other), do: other
end
