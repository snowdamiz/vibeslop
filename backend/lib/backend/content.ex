defmodule Backend.Content do
  @moduledoc """
  The Content context - handles posts, projects, and comments.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.{Post, Project, Comment}

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

    query = case feed_type do
      "following" ->
        # TODO: Filter by followed users
        query
      _ ->
        query
    end

    Repo.all(query)
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

    query = if search && search != "", do: where(query, [p], ilike(p.content, ^"%#{search}%")), else: query
    query = if tools != [], do: where(query, [p, u, l, c, proj, tools], tools.slug in ^tools), else: query
    query = if stacks != [], do: where(query, [p, u, l, c, proj, tools, stacks], stacks.slug in ^stacks), else: query

    query = case sort_by do
      "top" -> order_by(query, [p, u, l], [desc: count(l.id), desc: p.inserted_at])
      "trending" -> order_by(query, [p, u, l], [desc: count(l.id), desc: p.inserted_at])
      _ -> order_by(query, [p], desc: p.inserted_at)
    end

    Repo.all(query)
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
      nil -> {:error, :not_found}
      result -> {:ok, result}
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

    Repo.all(query)
  end

  @doc """
  Creates a post.
  """
  def create_post(user_id, attrs) do
    %Post{}
    |> Post.changeset(Map.put(attrs, :user_id, user_id))
    |> Repo.insert()
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

    query = if search && search != "", do: where(query, [proj], ilike(proj.title, ^"%#{search}%") or ilike(proj.description, ^"%#{search}%")), else: query

    # Filter by tools if provided
    query = if tools != [] do
      from [proj, u, l, c] in query,
        join: tools_rel in assoc(proj, :ai_tools),
        where: tools_rel.slug in ^tools
    else
      query
    end

    # Filter by stacks if provided
    query = if stacks != [] do
      from [proj, u, l, c] in query,
        join: stacks_rel in assoc(proj, :tech_stacks),
        where: stacks_rel.slug in ^stacks
    else
      query
    end

    query = case sort_by do
      "top" -> order_by(query, [proj, u, l], [desc: count(l.id), desc: proj.published_at])
      "trending" -> order_by(query, [proj, u, l], [desc: count(l.id), desc: proj.published_at])
      _ -> order_by(query, [proj], desc: proj.published_at)
    end

    results = Repo.all(query)

    # Preload associations separately to avoid GROUP BY issues
    Enum.map(results, fn %{project: project, user: user} = result ->
      project = Repo.preload(project, [:ai_tools, :tech_stacks])
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
            :prompts,
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

    # Preload associations separately
    Enum.map(results, fn %{project: project, user: user} = result ->
      project = Repo.preload(project, [:ai_tools, :tech_stacks])
      %{result | project: %{project | user: user}}
    end)
  end

  @doc """
  Creates a project.
  """
  def create_project(user_id, attrs) do
    %Project{}
    |> Project.changeset(Map.put(attrs, :user_id, user_id))
    |> Repo.insert()
  end

  ## Comments

  @doc """
  Lists comments for a commentable (Post or Project).
  """
  def list_comments(commentable_type, commentable_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)

    query =
      from c in Comment,
        join: u in assoc(c, :user),
        left_join: l in assoc(c, :likes),
        where: c.commentable_type == ^commentable_type and c.commentable_id == ^commentable_id and is_nil(c.parent_id),
        group_by: [c.id, u.id],
        select: %{
          comment: c,
          user: u,
          likes_count: count(l.id, :distinct)
        },
        order_by: [desc: c.inserted_at],
        limit: ^limit

    comments = Repo.all(query)

    # Load replies for each comment
    Enum.map(comments, fn comment_data ->
      replies = load_replies(comment_data.comment.id)
      Map.put(comment_data, :replies, replies)
    end)
  end

  defp load_replies(parent_id) do
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

    Repo.all(query)
  end

  @doc """
  Creates a comment.
  """
  def create_comment(user_id, attrs) do
    %Comment{}
    |> Comment.changeset(Map.put(attrs, :user_id, user_id))
    |> Repo.insert()
  end
end
