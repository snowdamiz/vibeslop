defmodule Backend.Content do
  @moduledoc """
  The Content context - handles posts, projects, and comments.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.{Post, PostMedia, Project, Comment}

  ## Posts

  @doc """
  Returns a list of posts for the feed with pagination.
  """
  def list_feed_posts(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    feed_type = Keyword.get(opts, :feed_type, "for-you")

    query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        group_by: [p.id, u.id],
        select: %{
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        },
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        offset: ^offset

    query =
      case feed_type do
        "following" ->
          # TODO: Filter by followed users
          query

        _ ->
          query
      end

    results = Repo.all(query)

    # Preload media for each post
    Enum.map(results, fn %{post: post} = result ->
      post = Repo.preload(post, :media)
      %{result | post: post}
    end)
  end

  @doc """
  Returns a unified feed combining posts and projects, sorted by date.
  """
  def list_unified_feed(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    feed_type = Keyword.get(opts, :feed_type, "for-you")
    current_user_id = Keyword.get(opts, :current_user_id)

    # Fetch posts
    post_query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        group_by: [p.id, u.id],
        select: %{
          id: p.id,
          type: "post",
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct),
          sort_date: p.inserted_at
        }

    post_query =
      case feed_type do
        "following" ->
          # TODO: Filter by followed users
          post_query

        _ ->
          post_query
      end

    posts =
      Repo.all(post_query)
      |> Enum.map(fn %{post: post} = result ->
        post =
          Repo.preload(post, [
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ])

        %{result | post: post}
      end)

    # Fetch published projects
    project_query =
      from proj in Project,
        join: u in assoc(proj, :user),
        left_join: l in assoc(proj, :likes),
        left_join: c in assoc(proj, :comments),
        where: proj.status == "published",
        group_by: [proj.id, u.id],
        select: %{
          id: proj.id,
          type: "project",
          project: proj,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct),
          sort_date: proj.published_at
        }

    project_query =
      case feed_type do
        "following" ->
          # TODO: Filter by followed users
          project_query

        _ ->
          project_query
      end

    projects =
      Repo.all(project_query)
      |> Enum.map(fn %{project: project, user: user} = result ->
        project = Repo.preload(project, [:ai_tools, :tech_stacks, :images])
        %{result | project: %{project | user: user}}
      end)

    # Fetch reposts
    reposts_query =
      from r in Backend.Social.Repost,
        join: ru in assoc(r, :user),
        select: %{
          id: r.id,
          type: "repost",
          repostable_type: r.repostable_type,
          repostable_id: r.repostable_id,
          reposter: ru,
          sort_date: r.inserted_at
        }

    reposts_query =
      case feed_type do
        "following" ->
          # TODO: Filter by followed users
          reposts_query

        _ ->
          reposts_query
      end

    reposts =
      Repo.all(reposts_query)
      |> Enum.map(fn repost ->
        # Load the original post or project
        case repost.repostable_type do
          "Post" ->
            case Repo.get(Post, repost.repostable_id) do
              nil ->
                nil

              post ->
                post =
                  Repo.preload(post, [
                    :user,
                    :media,
                    quoted_post: [:user, :media],
                    quoted_project: [:user, :ai_tools, :tech_stacks, :images]
                  ])

                # Get likes and comments count
                likes_count = Backend.Social.get_likes_count("Post", post.id)
                comments_count = Backend.Content.get_comments_count("Post", post.id)

                %{
                  id: repost.id,
                  type: "repost",
                  post: post,
                  user: post.user,
                  reposter: repost.reposter,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  sort_date: repost.sort_date
                }
            end

          "Project" ->
            case Repo.get(Project, repost.repostable_id) do
              nil ->
                nil

              project ->
                project = Repo.preload(project, [:user, :ai_tools, :tech_stacks, :images])

                # Get likes and comments count
                likes_count = Backend.Social.get_likes_count("Project", project.id)
                comments_count = Backend.Content.get_comments_count("Project", project.id)

                %{
                  id: repost.id,
                  type: "repost",
                  project: project,
                  user: project.user,
                  reposter: repost.reposter,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  sort_date: repost.sort_date
                }
            end

          _ ->
            nil
        end
      end)
      |> Enum.filter(&(&1 != nil))

    # Combine and sort by date descending
    feed_items =
      (posts ++ projects ++ reposts)
      |> Enum.sort_by(& &1.sort_date, {:desc, DateTime})
      |> Enum.drop(offset)
      |> Enum.take(limit)

    # Add repost counts for all items
    feed_items_with_reposts = add_reposts_count(feed_items)

    # Add engagement status if user is authenticated
    if current_user_id do
      add_engagement_status(feed_items_with_reposts, current_user_id)
    else
      feed_items_with_reposts
    end
  end

  defp add_reposts_count(feed_items) do
    Enum.map(feed_items, fn item ->
      {item_type, item_id} =
        case item.type do
          "post" ->
            {"Post", item.post.id}

          "project" ->
            {"Project", item.project.id}

          "repost" ->
            # For reposts, get the count of the original item
            if Map.has_key?(item, :post) do
              {"Post", item.post.id}
            else
              {"Project", item.project.id}
            end
        end

      reposts_count = Backend.Social.get_reposts_count(item_type, item_id)
      Map.put(item, :reposts_count, reposts_count)
    end)
  end

  defp add_engagement_status(feed_items, user_id) do
    Enum.map(feed_items, fn item ->
      {item_type, item_id} =
        case item.type do
          "post" ->
            {"Post", item.post.id}

          "project" ->
            {"Project", item.project.id}

          "repost" ->
            # For reposts, get the engagement of the original item
            if Map.has_key?(item, :post) do
              {"Post", item.post.id}
            else
              {"Project", item.project.id}
            end
        end

      liked = Backend.Social.has_liked?(user_id, item_type, item_id)
      bookmarked = Backend.Social.has_bookmarked?(user_id, item_type, item_id)
      reposted = Backend.Social.has_reposted?(user_id, item_type, item_id)

      item
      |> Map.put(:liked, liked)
      |> Map.put(:bookmarked, bookmarked)
      |> Map.put(:reposted, reposted)
    end)
  end

  @doc """
  Returns a list of posts for explore page with filters.
  """
  def list_explore_posts(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    search = Keyword.get(opts, :search)
    tools = Keyword.get(opts, :tools, [])
    stacks = Keyword.get(opts, :stacks, [])
    sort_by = Keyword.get(opts, :sort_by, "recent")

    query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        left_join: proj in assoc(p, :linked_project),
        left_join: tools in assoc(proj, :ai_tools),
        left_join: stacks in assoc(proj, :tech_stacks),
        group_by: [p.id, u.id, proj.id],
        select: %{
          post: p,
          user: u,
          project: proj,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        },
        limit: ^limit,
        offset: ^offset

    query =
      if search && search != "",
        do: where(query, [p], ilike(p.content, ^"%#{search}%")),
        else: query

    query =
      if tools != [],
        do: where(query, [p, u, l, c, proj, tools], tools.slug in ^tools),
        else: query

    query =
      if stacks != [],
        do: where(query, [p, u, l, c, proj, tools, stacks], stacks.slug in ^stacks),
        else: query

    query =
      case sort_by do
        "top" -> order_by(query, [p, u, l], desc: count(l.id), desc: p.inserted_at)
        "trending" -> order_by(query, [p, u, l], desc: count(l.id), desc: p.inserted_at)
        _ -> order_by(query, [p], desc: p.inserted_at)
      end

    results = Repo.all(query)

    # Preload media for each post
    Enum.map(results, fn %{post: post} = result ->
      post = Repo.preload(post, :media)
      %{result | post: post}
    end)
  end

  @doc """
  Gets a single post with associations.
  """
  def get_post!(id) do
    query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        where: p.id == ^id,
        group_by: [p.id, u.id],
        select: %{
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        }

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      %{post: post} = result ->
        post =
          Repo.preload(post, [
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ])

        {:ok, %{result | post: post}}
    end
  end

  @doc """
  Lists posts by a specific user.
  """
  def list_user_posts(username, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        where: u.username == ^username,
        group_by: [p.id, u.id],
        select: %{
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        },
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        offset: ^offset

    results = Repo.all(query)

    # Preload media and quoted items for each post
    Enum.map(results, fn %{post: post} = result ->
      post =
        Repo.preload(post, [
          :media,
          quoted_post: [:user, :media],
          quoted_project: [:user, :ai_tools, :tech_stacks, :images]
        ])

      %{result | post: post}
    end)
  end

  @doc """
  Returns a unified timeline for a specific user, combining their posts and their reposts.
  """
  def list_user_timeline(username, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    current_user_id = Keyword.get(opts, :current_user_id)

    # Fetch user's own posts
    post_query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        where: u.username == ^username,
        group_by: [p.id, u.id],
        select: %{
          id: p.id,
          type: "post",
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct),
          sort_date: p.inserted_at
        }

    posts =
      Repo.all(post_query)
      |> Enum.map(fn %{post: post} = result ->
        post =
          Repo.preload(post, [
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ])

        %{result | post: post}
      end)

    # Fetch user's reposts
    reposts_query =
      from r in Backend.Social.Repost,
        join: ru in assoc(r, :user),
        where: ru.username == ^username,
        select: %{
          id: r.id,
          type: "repost",
          repostable_type: r.repostable_type,
          repostable_id: r.repostable_id,
          reposter: ru,
          sort_date: r.inserted_at
        }

    reposts =
      Repo.all(reposts_query)
      |> Enum.map(fn repost ->
        case repost.repostable_type do
          "Post" ->
            case Repo.get(Post, repost.repostable_id) do
              nil ->
                nil

              post ->
                post =
                  Repo.preload(post, [
                    :user,
                    :media,
                    quoted_post: [:user, :media],
                    quoted_project: [:user, :ai_tools, :tech_stacks, :images]
                  ])

                likes_count = Backend.Social.get_likes_count("Post", post.id)
                comments_count = Backend.Content.get_comments_count("Post", post.id)

                %{
                  id: repost.id,
                  type: "repost",
                  post: post,
                  user: post.user,
                  reposter: repost.reposter,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  sort_date: repost.sort_date
                }
            end

          "Project" ->
            case Repo.get(Project, repost.repostable_id) do
              nil ->
                nil

              project ->
                project = Repo.preload(project, [:user, :ai_tools, :tech_stacks, :images])

                likes_count = Backend.Social.get_likes_count("Project", project.id)
                comments_count = Backend.Content.get_comments_count("Project", project.id)

                %{
                  id: repost.id,
                  type: "repost",
                  project: project,
                  user: project.user,
                  reposter: repost.reposter,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  sort_date: repost.sort_date
                }
            end

          _ ->
            nil
        end
      end)
      |> Enum.filter(&(&1 != nil))

    # Combine and sort
    timeline_items =
      (posts ++ reposts)
      |> Enum.sort_by(& &1.sort_date, {:desc, DateTime})
      |> Enum.drop(offset)
      |> Enum.take(limit)

    # Add repost counts
    timeline_items_with_reposts = add_reposts_count(timeline_items)

    # Add engagement status
    if current_user_id do
      # Note: add_engagement_status for items (plural) is private and defined for unified feed
      # but it takes the same format, so we can reuse it if it's accessible or re-implement
      # Since it's private in the same module, we can call it.
      add_engagement_status(timeline_items_with_reposts, current_user_id)
    else
      timeline_items_with_reposts
    end
  end

  @doc """
  Deletes a post if the user is the owner.
  """
  def delete_post(post_id, user_id) do
    case Repo.get(Post, post_id) do
      nil ->
        {:error, :not_found}

      %Post{user_id: ^user_id} = post ->
        Repo.delete(post)

      %Post{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Creates a post with optional media attachments.
  """
  def create_post(user_id, attrs) do
    media_list = Map.get(attrs, "media", []) || Map.get(attrs, :media, []) || []
    has_media? = media_list != [] and media_list != nil

    result =
      Repo.transaction(fn ->
        # Create the post - use string keys consistently since attrs comes from JSON
        post_attrs =
          attrs
          |> Map.drop(["media", :media])
          |> Map.put("user_id", user_id)

        changeset = Post.changeset_with_media(%Post{}, post_attrs, has_media?)

        case Repo.insert(changeset) do
          {:ok, post} ->
            # Create media attachments
            media_list
            |> Enum.with_index()
            |> Enum.each(fn {media_url, index} ->
              %PostMedia{}
              |> PostMedia.changeset(%{url: media_url, position: index, post_id: post.id})
              |> Repo.insert!()
            end)

            # If this post quotes another post or project, increment their quotes_count
            quoted_post_id =
              Map.get(post_attrs, "quoted_post_id") || Map.get(post_attrs, :quoted_post_id)

            quoted_project_id =
              Map.get(post_attrs, "quoted_project_id") || Map.get(post_attrs, :quoted_project_id)

            if quoted_post_id do
              Backend.Metrics.increment_counter("Post", quoted_post_id, :quotes_count)
              Backend.Metrics.record_hourly_engagement("Post", quoted_post_id, :quotes)
            end

            if quoted_project_id do
              Backend.Metrics.increment_counter("Project", quoted_project_id, :quotes_count)
              Backend.Metrics.record_hourly_engagement("Project", quoted_project_id, :quotes)
            end

            post

          {:error, changeset} ->
            Repo.rollback(changeset)
        end
      end)

    # If post was created successfully, process mentions
    case result do
      {:ok, post} ->
        content = Map.get(attrs, "content") || Map.get(attrs, :content) || ""
        Backend.Mentions.notify_mentioned_users(content, user_id, "Post", post.id)
        {:ok, post}

      error ->
        error
    end
  end

  ## Projects

  @doc """
  Returns a list of projects with pagination and filters.
  """
  def list_projects(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    search = Keyword.get(opts, :search)
    tools = Keyword.get(opts, :tools, [])
    stacks = Keyword.get(opts, :stacks, [])
    sort_by = Keyword.get(opts, :sort_by, "recent")

    query =
      from proj in Project,
        join: u in assoc(proj, :user),
        left_join: l in assoc(proj, :likes),
        left_join: c in assoc(proj, :comments),
        where: proj.status == "published",
        group_by: [proj.id, u.id],
        select: %{
          project: proj,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        },
        limit: ^limit,
        offset: ^offset

    query =
      if search && search != "",
        do:
          where(
            query,
            [proj],
            ilike(proj.title, ^"%#{search}%") or ilike(proj.description, ^"%#{search}%")
          ),
        else: query

    # Filter by tools if provided
    query =
      if tools != [] do
        from [proj, u, l, c] in query,
          join: tools_rel in assoc(proj, :ai_tools),
          where: tools_rel.slug in ^tools
      else
        query
      end

    # Filter by stacks if provided
    query =
      if stacks != [] do
        from [proj, u, l, c] in query,
          join: stacks_rel in assoc(proj, :tech_stacks),
          where: stacks_rel.slug in ^stacks
      else
        query
      end

    query =
      case sort_by do
        "top" -> order_by(query, [proj, u, l], desc: count(l.id), desc: proj.published_at)
        "trending" -> order_by(query, [proj, u, l], desc: count(l.id), desc: proj.published_at)
        _ -> order_by(query, [proj], desc: proj.published_at)
      end

    results = Repo.all(query)

    # Preload associations separately to avoid GROUP BY issues (including images for thumbnails)
    Enum.map(results, fn %{project: project, user: user} = result ->
      project = Repo.preload(project, [:ai_tools, :tech_stacks, :images])
      %{result | project: %{project | user: user}}
    end)
  end

  @doc """
  Gets a single project with all associations.
  """
  def get_project!(id) do
    query =
      from proj in Project,
        where: proj.id == ^id,
        left_join: l in assoc(proj, :likes),
        left_join: c in assoc(proj, :comments),
        group_by: proj.id,
        select: %{
          project: proj,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        }

    case Repo.one(query) do
      nil ->
        {:error, :not_found}

      %{project: project} = result ->
        project =
          project
          |> Repo.preload([
            :user,
            :ai_tools,
            :tech_stacks,
            :images,
            :highlights,
            :timeline_entries
          ])

        {:ok, Map.put(result, :project, project)}
    end
  end

  @doc """
  Lists projects by a specific user.
  """
  def list_user_projects(username, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from proj in Project,
        join: u in assoc(proj, :user),
        left_join: l in assoc(proj, :likes),
        left_join: c in assoc(proj, :comments),
        where: u.username == ^username and proj.status == "published",
        group_by: [proj.id, u.id],
        select: %{
          project: proj,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct)
        },
        order_by: [desc: proj.published_at],
        limit: ^limit,
        offset: ^offset

    results = Repo.all(query)

    # Preload associations separately (including images for thumbnails)
    Enum.map(results, fn %{project: project, user: user} = result ->
      project = Repo.preload(project, [:ai_tools, :tech_stacks, :images])
      %{result | project: %{project | user: user}}
    end)
  end

  @doc """
  Creates a project with all related data (images, tools, stacks, highlights, prompts, timeline).
  """
  def create_project(user_id, attrs) do
    Repo.transaction(fn ->
      # Extract nested data
      images = Map.get(attrs, "images", []) || Map.get(attrs, :images, []) || []
      tools = Map.get(attrs, "tools", []) || Map.get(attrs, :tools, []) || []
      stacks = Map.get(attrs, "stack", []) || Map.get(attrs, :stack, []) || []
      highlights = Map.get(attrs, "highlights", []) || Map.get(attrs, :highlights, []) || []
      timeline = Map.get(attrs, "timeline", []) || Map.get(attrs, :timeline, []) || []
      links = Map.get(attrs, "links", %{}) || Map.get(attrs, :links, %{})

      # Parse links
      live_url = Map.get(links, "live") || Map.get(links, :live)
      github_url = Map.get(links, "github") || Map.get(links, :github)

      # Create base project attrs
      project_attrs = %{
        "title" => Map.get(attrs, "title") || Map.get(attrs, :title),
        "description" => Map.get(attrs, "description") || Map.get(attrs, :description),
        "status" => "published",
        "published_at" => DateTime.utc_now(),
        "user_id" => user_id
      }

      # Add optional fields
      project_attrs =
        if live_url, do: Map.put(project_attrs, "live_url", live_url), else: project_attrs

      project_attrs =
        if github_url, do: Map.put(project_attrs, "github_url", github_url), else: project_attrs

      # Create project
      project =
        case Repo.insert(Project.changeset(%Project{}, project_attrs)) do
          {:ok, project} -> project
          {:error, changeset} -> Repo.rollback(changeset)
        end

      # Create images
      images
      |> Enum.with_index()
      |> Enum.each(fn {image_url, index} ->
        %Backend.Content.ProjectImage{}
        |> Backend.Content.ProjectImage.changeset(%{
          url: image_url,
          position: index,
          project_id: project.id
        })
        |> Repo.insert!()
      end)

      # Associate AI tools
      tool_records =
        tools
        |> Enum.map(fn tool_name ->
          # Try to find existing tool or create new one
          slug = String.downcase(tool_name) |> String.replace(~r/[^a-z0-9]+/, "-")

          case Backend.Catalog.get_ai_tool_by_slug(slug) do
            nil ->
              # Create new tool
              {:ok, tool} =
                Repo.insert(%Backend.Catalog.AiTool{
                  name: tool_name,
                  slug: slug
                })

              tool

            tool ->
              tool
          end
        end)

      # Associate tech stacks
      stack_records =
        stacks
        |> Enum.map(fn stack_name ->
          slug = String.downcase(stack_name) |> String.replace(~r/[^a-z0-9]+/, "-")

          case Backend.Catalog.get_tech_stack_by_slug(slug) do
            nil ->
              # Create new stack
              {:ok, stack} =
                Repo.insert(%Backend.Catalog.TechStack{
                  name: stack_name,
                  slug: slug,
                  category: "other"
                })

              stack

            stack ->
              stack
          end
        end)

      # Create many-to-many associations
      project =
        project
        |> Repo.preload([:ai_tools, :tech_stacks])
        |> Ecto.Changeset.change()
        |> Ecto.Changeset.put_assoc(:ai_tools, tool_records)
        |> Ecto.Changeset.put_assoc(:tech_stacks, stack_records)
        |> Repo.update!()

      # Create highlights
      highlights
      |> Enum.with_index()
      |> Enum.each(fn {highlight_text, index} ->
        %Backend.Content.ProjectHighlight{}
        |> Backend.Content.ProjectHighlight.changeset(%{
          content: highlight_text,
          position: index,
          project_id: project.id
        })
        |> Repo.insert!()
      end)



      # Create timeline entries
      timeline
      |> Enum.with_index()
      |> Enum.each(fn {entry_data, index} ->
        # Parse date string to Date
        date_str = Map.get(entry_data, "date") || Map.get(entry_data, :date)

        date =
          case Date.from_iso8601(date_str) do
            {:ok, date} ->
              date

            _ ->
              # Try parsing common formats like "Jan 5, 2026"
              # For now, fallback to today if parsing fails
              Date.utc_today()
          end

        entry_attrs = %{
          occurred_at: date,
          title: Map.get(entry_data, "title") || Map.get(entry_data, :title),
          description: Map.get(entry_data, "description") || Map.get(entry_data, :description),
          position: index,
          project_id: project.id
        }

        %Backend.Content.ProjectTimelineEntry{}
        |> Backend.Content.ProjectTimelineEntry.changeset(entry_attrs)
        |> Repo.insert!()
      end)

      # Return the project with all associations loaded
      project
      |> Repo.preload([
        :user,
        :images,
        :ai_tools,
        :tech_stacks,
        :highlights,
        :timeline_entries,
        :likes,
        :comments
      ])
    end)
  end

  @doc """
  Deletes a project if the user is the owner.
  """
  def delete_project(project_id, user_id) do
    case Repo.get(Project, project_id) do
      nil ->
        {:error, :not_found}

      %Project{user_id: ^user_id} = project ->
        Repo.delete(project)

      %Project{} ->
        {:error, :unauthorized}
    end
  end

  ## Comments

  @doc """
  Lists comments for a commentable (Post or Project).
  Accepts optional current_user_id to determine if user has liked each comment.
  """
  def list_comments(commentable_type, commentable_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    current_user_id = Keyword.get(opts, :current_user_id)

    query =
      from c in Comment,
        join: u in assoc(c, :user),
        left_join: l in assoc(c, :likes),
        where:
          c.commentable_type == ^commentable_type and c.commentable_id == ^commentable_id and
            is_nil(c.parent_id),
        group_by: [c.id, u.id],
        select: %{
          comment: c,
          user: u,
          likes_count: count(l.id, :distinct)
        },
        order_by: [desc: c.inserted_at],
        limit: ^limit

    comments = Repo.all(query)

    # Load replies and add like status for each comment
    Enum.map(comments, fn comment_data ->
      replies = load_replies(comment_data.comment.id, current_user_id)

      is_liked =
        if current_user_id do
          Backend.Social.has_liked?(current_user_id, "Comment", comment_data.comment.id)
        else
          false
        end

      comment_data
      |> Map.put(:replies, replies)
      |> Map.put(:is_liked, is_liked)
    end)
  end

  defp load_replies(parent_id, current_user_id) do
    query =
      from c in Comment,
        join: u in assoc(c, :user),
        left_join: l in assoc(c, :likes),
        where: c.parent_id == ^parent_id,
        group_by: [c.id, u.id],
        select: %{
          comment: c,
          user: u,
          likes_count: count(l.id, :distinct)
        },
        order_by: [asc: c.inserted_at]

    replies = Repo.all(query)

    # Add like status for each reply
    Enum.map(replies, fn reply_data ->
      is_liked =
        if current_user_id do
          Backend.Social.has_liked?(current_user_id, "Comment", reply_data.comment.id)
        else
          false
        end

      Map.put(reply_data, :is_liked, is_liked)
    end)
  end

  @doc """
  Creates a comment.
  """
  def create_comment(user_id, attrs) do
    result =
      %Comment{}
      |> Comment.changeset(Map.put(attrs, "user_id", user_id))
      |> Repo.insert()

    # If comment was created successfully, process mentions and update counters
    case result do
      {:ok, comment} ->
        content = Map.get(attrs, "content") || Map.get(attrs, :content) || ""
        commentable_type = Map.get(attrs, "commentable_type") || Map.get(attrs, :commentable_type)
        commentable_id = Map.get(attrs, "commentable_id") || Map.get(attrs, :commentable_id)

        # Increment comments counter and record hourly engagement
        Backend.Metrics.increment_counter(commentable_type, commentable_id, :comments_count)
        Backend.Metrics.record_hourly_engagement(commentable_type, commentable_id, :comments)

        # Create mention notifications with the commentable as the target
        Backend.Mentions.notify_mentioned_users(
          content,
          user_id,
          commentable_type,
          commentable_id
        )

        {:ok, comment}

      error ->
        error
    end
  end

  @doc """
  Deletes a comment if the user is the owner.
  """
  def delete_comment(comment_id, user_id) do
    case Repo.get(Comment, comment_id) do
      nil ->
        {:error, :not_found}

      %Comment{
        user_id: ^user_id,
        commentable_type: commentable_type,
        commentable_id: commentable_id
      } = comment ->
        result = Repo.delete(comment)

        case result do
          {:ok, deleted_comment} ->
            # Decrement comments counter
            Backend.Metrics.decrement_counter(commentable_type, commentable_id, :comments_count)
            {:ok, deleted_comment}

          error ->
            error
        end

      %Comment{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Gets count of comments for a specific item.
  """
  def get_comments_count(commentable_type, commentable_id) do
    query =
      from c in Comment,
        where: c.commentable_type == ^commentable_type and c.commentable_id == ^commentable_id,
        select: count(c.id)

    Repo.one(query)
  end

  ## Impressions

  @doc """
  Records impressions for multiple posts and projects in a batch.
  Accepts a list of %{type: "post" | "project", id: uuid} and opts with user_id/fingerprint.
  Only increments counters for successfully recorded impressions (no duplicates).
  Returns {:ok, recorded_count} on success.
  """
  def record_impressions(impressions, opts \\ []) when is_list(impressions) do
    user_id = Keyword.get(opts, :user_id)
    fingerprint = Keyword.get(opts, :fingerprint)
    ip_address = Keyword.get(opts, :ip_address)

    # Process each impression individually (no outer transaction)
    # This allows some to succeed even if others fail due to duplicates
    {recorded_posts, recorded_projects} =
      Enum.reduce(impressions, {[], []}, fn imp, {posts_acc, projects_acc} ->
        type_str = imp["type"] || imp[:type]
        id = imp["id"] || imp[:id]

        # Normalize type to Post/Project for database
        impressionable_type =
          case type_str do
            "post" -> "Post"
            "project" -> "Project"
            _ -> type_str
          end

        # Try to record the impression
        case Backend.Social.record_impression(
               impressionable_type,
               id,
               user_id: user_id,
               fingerprint: fingerprint,
               ip_address: ip_address
             ) do
          {:ok, %Backend.Social.Impression{}} ->
            # Successfully recorded NEW impression, track for counter increment and hourly tracking
            case impressionable_type do
              "Post" ->
                # Record hourly engagement for impressions
                Backend.Metrics.record_hourly_engagement("Post", id, :impressions)
                {[id | posts_acc], projects_acc}

              "Project" ->
                Backend.Metrics.record_hourly_engagement("Project", id, :impressions)
                {posts_acc, [id | projects_acc]}

              _ ->
                {posts_acc, projects_acc}
            end

          {:ok, :already_impressed} ->
            # Skip duplicates silently (no counter increment needed)
            {posts_acc, projects_acc}

          {:error, _reason} ->
            # Skip errors silently
            {posts_acc, projects_acc}
        end
      end)

    # Batch increment counters only for successfully recorded impressions
    post_count =
      if recorded_posts != [] do
        {count, _} =
          from(p in Post, where: p.id in ^recorded_posts)
          |> Repo.update_all(inc: [impression_count: 1])

        count
      else
        0
      end

    project_count =
      if recorded_projects != [] do
        {count, _} =
          from(proj in Project, where: proj.id in ^recorded_projects)
          |> Repo.update_all(inc: [view_count: 1])

        count
      else
        0
      end

    {:ok, post_count + project_count}
  end
end
