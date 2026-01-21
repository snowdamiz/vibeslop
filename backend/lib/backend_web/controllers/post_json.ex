defmodule BackendWeb.PostJSON do
  @doc """
  Renders a list of posts.
  """
  def index(%{posts: posts}) do
    %{data: for(post_data <- posts, do: data(post_data))}
  end

  @doc """
  Renders a unified feed (posts + projects) with cursor pagination.
  """
  def index_unified(%{feed_result: %{items: items, next_cursor: next_cursor, has_more: has_more}}) do
    %{
      data: for(item <- items, do: render_feed_item(item)),
      next_cursor: next_cursor,
      has_more: has_more
    }
  end

  # Legacy support for old format without cursor pagination
  def index_unified(%{feed_items: feed_items}) do
    %{data: for(item <- feed_items, do: render_feed_item(item))}
  end

  @doc """
  Renders a single post.
  """
  def show(%{post: post_data}) do
    %{data: data(post_data)}
  end

  defp render_feed_item(%{type: "post"} = item), do: data(item)
  defp render_feed_item(%{type: "project"} = item), do: project_data(item)
  defp render_feed_item(%{type: "repost"} = item), do: repost_data(item)

  defp data(%{post: post, user: user} = post_data) do
    media =
      case post.media do
        %Ecto.Association.NotLoaded{} -> []
        nil -> []
        media_list -> Enum.map(media_list, & &1.url)
      end

    base_data = %{
      id: post.id,
      type: "update",
      content: post.content,
      likes: Map.get(post_data, :likes_count, 0),
      comments: Map.get(post_data, :comments_count, 0),
      reposts: Map.get(post_data, :reposts_count, 0),
      impressions: post.impression_count || 0,
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
      project: render_project(Map.get(post_data, :project)),
      quoted_post: render_quoted_post(post.quoted_post),
      quoted_project: render_quoted_project(post.quoted_project)
    }

    # Add engagement status if present
    base_data
    |> add_engagement_field(post_data, :liked)
    |> add_engagement_field(post_data, :bookmarked)
    |> add_engagement_field(post_data, :reposted)
  end

  defp project_data(%{project: project} = project_data) do
    user = project.user

    # Get first image if available
    image =
      case project.images do
        %Ecto.Association.NotLoaded{} -> nil
        nil -> nil
        [] -> nil
        [first | _] -> first.url
      end

    base_data = %{
      id: project.id,
      type: "project",
      title: project.title,
      content: project.description,
      image: image,
      likes: Map.get(project_data, :likes_count, 0),
      comments: Map.get(project_data, :comments_count, 0),
      reposts: Map.get(project_data, :reposts_count, 0),
      impressions: project.view_count || 0,
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

    # Add engagement status if present
    base_data
    |> add_engagement_field(project_data, :liked)
    |> add_engagement_field(project_data, :bookmarked)
    |> add_engagement_field(project_data, :reposted)
  end

  # Format DateTime to ISO 8601 with Z suffix for proper JS parsing
  defp format_datetime(nil), do: nil
  defp format_datetime(%DateTime{} = dt), do: DateTime.to_iso8601(dt)
  defp format_datetime(other), do: other

  defp render_project(nil), do: nil

  defp render_project(project) do
    %{
      id: project.id,
      title: project.title
    }
  end

  defp render_quoted_post(nil), do: nil
  defp render_quoted_post(%Ecto.Association.NotLoaded{}), do: nil

  defp render_quoted_post(post) do
    media =
      case post.media do
        %Ecto.Association.NotLoaded{} -> []
        nil -> []
        media_list -> Enum.map(media_list, & &1.url)
      end

    %{
      id: post.id,
      type: "update",
      content: post.content,
      created_at: format_datetime(post.inserted_at),
      media: media,
      author: %{
        id: post.user.id,
        name: post.user.display_name,
        username: post.user.username,
        initials: get_initials(post.user.display_name),
        avatar_url: post.user.avatar_url,
        is_verified: post.user.is_verified
      }
    }
  end

  defp render_quoted_project(nil), do: nil
  defp render_quoted_project(%Ecto.Association.NotLoaded{}), do: nil

  defp render_quoted_project(project) do
    image =
      case project.images do
        %Ecto.Association.NotLoaded{} -> nil
        nil -> nil
        [] -> nil
        [first | _] -> first.url
      end

    %{
      id: project.id,
      type: "project",
      title: project.title,
      content: project.description,
      image: image,
      created_at: format_datetime(project.published_at || project.inserted_at),
      tools: Enum.map(project.ai_tools || [], & &1.name),
      stack: Enum.map(project.tech_stacks || [], & &1.name),
      author: %{
        id: project.user.id,
        name: project.user.display_name,
        username: project.user.username,
        initials: get_initials(project.user.display_name),
        avatar_url: project.user.avatar_url,
        is_verified: project.user.is_verified
      }
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

  defp add_engagement_field(data, source, field) do
    case Map.get(source, field) do
      nil -> data
      value -> Map.put(data, field, value)
    end
  end

  defp repost_data(%{id: repost_id, reposter: reposter} = item) do
    reposter_info = %{
      id: reposter.id,
      name: reposter.display_name,
      username: reposter.username,
      initials: get_initials(reposter.display_name),
      avatar_url: reposter.avatar_url,
      is_verified: reposter.is_verified
    }

    # Get the underlying item data (post or project)
    base_data =
      if Map.has_key?(item, :post) do
        # It's a reposted post
        data(%{item | type: "post"})
      else
        # It's a reposted project
        project_data(%{item | type: "project"})
      end

    # Store the original item's ID and use repost ID as the main ID
    original_id = base_data.id

    # Add repost metadata with unique repost ID
    base_data
    |> Map.put(:id, repost_id)
    |> Map.put(:original_id, original_id)
    |> Map.put(:is_repost, true)
    |> Map.put(:reposted_by, reposter_info)
  end
end
