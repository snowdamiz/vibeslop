defmodule BackendWeb.PostJSON do
  @doc """
  Renders a list of posts.
  """
  def index(%{posts: posts}) do
    %{data: for(post_data <- posts, do: data(post_data))}
  end

  @doc """
  Renders a single post.
  """
  def show(%{post: post_data}) do
    %{data: data(post_data)}
  end

  defp data(%{post: post, user: user} = post_data) do
    %{
      id: post.id,
      type: "update",
      content: post.content,
      likes: Map.get(post_data, :likes_count, 0),
      comments: Map.get(post_data, :comments_count, 0),
      reposts: 0,
      created_at: post.inserted_at,
      author: %{
        id: user.id,
        name: user.display_name,
        username: user.username,
        initials: get_initials(user.display_name),
        avatar_url: user.avatar_url,
        is_verified: user.is_verified
      },
      project: render_project(Map.get(post_data, :project))
    }
  end

  defp render_project(nil), do: nil
  defp render_project(project) do
    %{
      id: project.id,
      title: project.title
    }
  end

  defp get_initials(name) do
    name
    |> String.split(" ")
    |> Enum.take(2)
    |> Enum.map(&String.first/1)
    |> Enum.join("")
    |> String.upcase()
  end
end
