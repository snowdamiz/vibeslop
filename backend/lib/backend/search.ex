defmodule Backend.Search do
  @moduledoc """
  Search context for unified search across users, projects, and posts.
  Supports advanced search operators like X/Twitter.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts.User
  alias Backend.Content.{Post, Project}

  @doc """
  Parse search query and extract operators.

  Supported operators:
  - from:username - content from specific user
  - has:media|project - filter by content type
  - tool:slug - projects using specific AI tool
  - stack:slug - projects using specific tech stack
  - since:YYYY-MM-DD - posted after date
  - until:YYYY-MM-DD - posted before date
  - -term - exclude term
  - "exact phrase" - exact phrase match
  """
  def parse_query(query_string) do
    # Extract operators
    from_match = Regex.run(~r/from:(\w+)/, query_string)
    has_matches = Regex.scan(~r/has:(\w+)/, query_string)
    tool_matches = Regex.scan(~r/tool:(\w+)/, query_string)
    stack_matches = Regex.scan(~r/stack:(\w+)/, query_string)
    since_match = Regex.run(~r/since:([\d-]+)/, query_string)
    until_match = Regex.run(~r/until:([\d-]+)/, query_string)

    # Extract quoted phrases
    quoted_phrases = Regex.scan(~r/"([^"]+)"/, query_string) |> Enum.map(fn [_, phrase] -> phrase end)

    # Extract excluded terms
    excluded_terms = Regex.scan(~r/-(\w+)/, query_string) |> Enum.map(fn [_, term] -> term end)

    # Clean query by removing operators
    clean_query = query_string
    |> String.replace(~r/from:\w+/, "")
    |> String.replace(~r/has:\w+/, "")
    |> String.replace(~r/tool:\w+/, "")
    |> String.replace(~r/stack:\w+/, "")
    |> String.replace(~r/since:[\d-]+/, "")
    |> String.replace(~r/until:[\d-]+/, "")
    |> String.replace(~r/"[^"]+"/, "")
    |> String.replace(~r/-\w+/, "")
    |> String.trim()

    %{
      query: clean_query,
      from_user: from_match && Enum.at(from_match, 1),
      has: has_matches |> Enum.map(fn [_, type] -> type end),
      tools: tool_matches |> Enum.map(fn [_, tool] -> tool end),
      stacks: stack_matches |> Enum.map(fn [_, stack] -> stack end),
      since: since_match && parse_date(Enum.at(since_match, 1)),
      until: until_match && parse_date(Enum.at(until_match, 1)),
      quoted_phrases: quoted_phrases,
      excluded_terms: excluded_terms
    }
  end

  defp parse_date(date_string) do
    case Date.from_iso8601(date_string) do
      {:ok, date} -> date
      _ -> nil
    end
  end

  @doc """
  Unified search across all content types.
  Returns users, projects, and posts in a single response.
  """
  def unified_search(query_string, opts \\ []) do
    parsed = parse_query(query_string)
    current_user_id = Keyword.get(opts, :current_user_id)

    # Get top results from each category
    users = search_users(parsed, limit: 3)
    projects = search_projects(parsed, limit: 5, current_user_id: current_user_id)
    posts = search_posts(parsed, limit: 12, current_user_id: current_user_id)

    %{
      users: users,
      projects: projects,
      posts: posts
    }
  end

  @doc """
  Search for users by username or display name using full-text search.
  """
  def search_users(query_or_parsed, opts \\ [])

  def search_users(%{query: query} = parsed, opts) when is_map(parsed) do
    search_users(query, opts)
  end

  def search_users(query_string, opts) when is_binary(query_string) do
    limit = Keyword.get(opts, :limit, 10)
    offset = Keyword.get(opts, :offset, 0)
    exclude_user_id = Keyword.get(opts, :exclude_user_id)

    if String.trim(query_string) == "" do
      []
    else
      # Use full-text search with relevance ranking
      query =
        from u in User,
          where: fragment("? @@ plainto_tsquery('english', ?)", u.search_vector, ^query_string),
          order_by: [
            desc: fragment("ts_rank(?, plainto_tsquery('english', ?))", u.search_vector, ^query_string),
            asc: u.username
          ],
          limit: ^limit,
          offset: ^offset,
          select: u

      query = if exclude_user_id do
        from u in query, where: u.id != ^exclude_user_id
      else
        query
      end

      results = Repo.all(query)

      # Fallback to ILIKE if no full-text results
      if results == [] do
        search_pattern = "%#{query_string}%"

        query =
          from u in User,
            where: ilike(u.username, ^search_pattern) or ilike(u.display_name, ^search_pattern),
            order_by: [asc: u.username],
            limit: ^limit,
            offset: ^offset,
            select: u

        query = if exclude_user_id do
          from u in query, where: u.id != ^exclude_user_id
        else
          query
        end

        Repo.all(query)
      else
        results
      end
    end
  end

  @doc """
  Search for projects by title, description, tools, or stacks.
  """
  def search_projects(%{} = parsed, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    current_user_id = Keyword.get(opts, :current_user_id)

    query_string = parsed.query

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

    # Apply full-text search with relevance ranking
    query = if query_string != "" do
      from [proj, u] in query,
        where: fragment("? @@ plainto_tsquery('english', ?)", proj.search_vector, ^query_string),
        order_by: [
          desc: fragment("ts_rank(?, plainto_tsquery('english', ?))", proj.search_vector, ^query_string)
        ]
    else
      query
    end

    # Apply from_user filter
    query = if parsed.from_user do
      from [proj, u] in query,
        where: u.username == ^parsed.from_user
    else
      query
    end

    # Apply tools filter
    query = if parsed.tools != [] do
      from [proj, u] in query,
        join: tools_rel in assoc(proj, :ai_tools),
        where: tools_rel.slug in ^parsed.tools
    else
      query
    end

    # Apply stacks filter
    query = if parsed.stacks != [] do
      from [proj, u] in query,
        join: stacks_rel in assoc(proj, :tech_stacks),
        where: stacks_rel.slug in ^parsed.stacks
    else
      query
    end

    # Apply date filters
    query = if parsed.since do
      from [proj] in query,
        where: proj.published_at >= ^parsed.since
    else
      query
    end

    query = if parsed.until do
      from [proj] in query,
        where: proj.published_at <= ^parsed.until
    else
      # Fallback order when no search query
      from [proj, u] in query,
        order_by: [desc: proj.published_at]
    end

    results = Repo.all(query)

    # Add engagement status if user is authenticated
    if current_user_id do
      add_engagement_status(results, current_user_id, "Project")
    else
      results
    end
  end

  @doc """
  Search for posts by content.
  """
  def search_posts(%{} = parsed, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    current_user_id = Keyword.get(opts, :current_user_id)

    query_string = parsed.query

    query =
      from p in Post,
        join: u in assoc(p, :user),
        left_join: l in assoc(p, :likes),
        left_join: c in assoc(p, :comments),
        left_join: r in assoc(p, :reposts),
        left_join: linked_proj in assoc(p, :linked_project),
        left_join: quoted_post in assoc(p, :quoted_post),
        left_join: quoted_post_user in assoc(quoted_post, :user),
        left_join: quoted_proj in assoc(p, :quoted_project),
        left_join: quoted_proj_user in assoc(quoted_proj, :user),
        group_by: [
          p.id, u.id,
          linked_proj.id,
          quoted_post.id, quoted_post_user.id,
          quoted_proj.id, quoted_proj_user.id
        ],
        select: %{
          post: p,
          user: u,
          likes_count: count(l.id, :distinct),
          comments_count: count(c.id, :distinct),
          reposts_count: count(r.id, :distinct),
          linked_project: linked_proj,
          quoted_post: quoted_post,
          quoted_post_user: quoted_post_user,
          quoted_project: quoted_proj,
          quoted_project_user: quoted_proj_user
        },
        limit: ^limit,
        offset: ^offset

    # Apply full-text search with relevance ranking
    query = if query_string != "" do
      from [p] in query,
        where: fragment("? @@ plainto_tsquery('english', ?)", p.search_vector, ^query_string),
        order_by: [
          desc: fragment("ts_rank(?, plainto_tsquery('english', ?))", p.search_vector, ^query_string)
        ]
    else
      query
    end

    # Apply from_user filter
    query = if parsed.from_user do
      from [p, u] in query,
        where: u.username == ^parsed.from_user
    else
      query
    end

    # Apply has:media filter
    query = if "media" in parsed.has do
      from [p] in query,
        where: fragment("? IS NOT NULL AND array_length(?, 1) > 0", p.media, p.media)
    else
      query
    end

    # Apply has:project filter
    query = if "project" in parsed.has do
      from [p] in query,
        where: not is_nil(p.linked_project_id)
    else
      query
    end

    # Apply date filters
    query = if parsed.since do
      from [p] in query,
        where: p.inserted_at >= ^parsed.since
    else
      query
    end

    query = if parsed.until do
      from [p] in query,
        where: p.inserted_at <= ^parsed.until
    else
      # Fallback order when no search query
      from [p] in query,
        order_by: [desc: p.inserted_at]
    end

    results = Repo.all(query)

    # Add engagement status if user is authenticated
    if current_user_id do
      add_engagement_status(results, current_user_id, "Post")
    else
      results
    end
  end

  @doc """
  Get quick suggestions for typeahead.
  Returns matching users and projects.
  """
  def suggestions(query_string, opts \\ []) do
    limit = Keyword.get(opts, :limit, 5)

    if String.trim(query_string) == "" do
      %{users: [], projects: []}
    else
      users = search_users(query_string, limit: limit)
      projects = search_projects_titles(query_string, limit: limit)

      %{users: users, projects: projects}
    end
  end

  # Helper to search project titles only (for quick suggestions)
  defp search_projects_titles(query_string, opts) do
    limit = Keyword.get(opts, :limit, 5)

    # Try full-text search first
    results = Repo.all(
      from proj in Project,
        join: u in assoc(proj, :user),
        where: proj.status == "published" and
               fragment("? @@ plainto_tsquery('english', ?)", proj.search_vector, ^query_string),
        order_by: [
          desc: fragment("ts_rank(?, plainto_tsquery('english', ?))", proj.search_vector, ^query_string)
        ],
        limit: ^limit,
        select: %{
          id: proj.id,
          title: proj.title,
          user: u
        }
    )

    # Fallback to ILIKE if no results
    if results == [] do
      search_pattern = "%#{query_string}%"

      Repo.all(
        from proj in Project,
          join: u in assoc(proj, :user),
          where: proj.status == "published" and ilike(proj.title, ^search_pattern),
          order_by: [desc: proj.published_at],
          limit: ^limit,
          select: %{
            id: proj.id,
            title: proj.title,
            user: u
          }
      )
    else
      results
    end
  end

  # Helper function to add engagement status to items
  defp add_engagement_status(items, user_id, item_type) do
    Enum.map(items, fn item ->
      item_id = case item_type do
        "Post" -> item.post.id
        "Project" -> item.project.id
      end

      item
      |> Map.put(:liked, Backend.Social.has_liked?(user_id, item_type, item_id))
      |> Map.put(:bookmarked, Backend.Social.has_bookmarked?(user_id, item_type, item_id))
      |> Map.put(:reposted, Backend.Social.has_reposted?(user_id, item_type, item_id))
    end)
  end
end
