defmodule BackendWeb.UserController do
  use BackendWeb, :controller

  alias Backend.Accounts
  alias Backend.Content
  alias Backend.Social

  action_fallback BackendWeb.FallbackController

  def show(conn, %{"username" => username}) do
    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        # Preload preferred technologies for profile display
        user = Backend.Repo.preload(user, [:favorite_ai_tools, :preferred_tech_stacks])
        stats = Social.get_user_stats(user.id)

        # Add counts for posts and projects
        posts_count = length(Content.list_user_posts(username, limit: 1000))
        projects_count = length(Content.list_user_projects(username, limit: 1000))

        stats =
          Map.merge(stats, %{
            posts_count: posts_count,
            projects_count: projects_count
          })

        render(conn, :show, user: user, stats: stats)
    end
  end

  def posts(conn, %{"username" => username} = params) do
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    current_user = conn.assigns[:current_user]

    # Change default posts to include reposts (timeline)
    posts =
      Content.list_user_timeline(username,
        limit: limit,
        offset: offset,
        current_user_id: current_user && current_user.id
      )

    conn
    |> put_view(json: BackendWeb.PostJSON)
    |> render(:index, posts: posts)
  end

  def timeline(conn, %{"username" => username} = params) do
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    current_user = conn.assigns[:current_user]

    posts =
      Content.list_user_timeline(username,
        limit: limit,
        offset: offset,
        current_user_id: current_user && current_user.id
      )

    conn
    |> put_view(json: BackendWeb.PostJSON)
    |> render(:index, posts: posts)
  end

  def projects(conn, %{"username" => username} = params) do
    limit = String.to_integer(Map.get(params, "limit", "20"))
    offset = String.to_integer(Map.get(params, "offset", "0"))
    current_user = conn.assigns[:current_user]

    projects = Content.list_user_projects(username, limit: limit, offset: offset)

    # Add engagement status if user is authenticated
    projects_with_status =
      if current_user do
        add_engagement_status(projects, current_user.id, "Project")
      else
        projects
      end

    conn
    |> put_view(json: BackendWeb.ProjectJSON)
    |> render(:index, projects: projects_with_status)
  end

  def likes(conn, %{"username" => username} = params) do
    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        limit = String.to_integer(Map.get(params, "limit", "20"))
        offset = String.to_integer(Map.get(params, "offset", "0"))
        current_user = conn.assigns[:current_user]

        likes = Social.list_user_likes(user.id, limit: limit, offset: offset)

        # Convert likes to feed format with actual counts and engagement status
        items =
          Enum.map(likes, fn %{type: type, item: item} ->
            likes_count = Social.get_likes_count(type, item.id)
            reposts_count = Social.get_reposts_count(type, item.id)
            comments_count = Content.get_comments_count(type, item.id)

            # Get engagement status if user is authenticated
            {liked, bookmarked, reposted} =
              if current_user do
                {
                  Social.has_liked?(current_user.id, type, item.id),
                  Social.has_bookmarked?(current_user.id, type, item.id),
                  Social.has_reposted?(current_user.id, type, item.id)
                }
              else
                {false, false, false}
              end

            case type do
              "Post" ->
                %{
                  post: item,
                  user: item.user,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  reposts_count: reposts_count,
                  liked: liked,
                  bookmarked: bookmarked,
                  reposted: reposted
                }

              "Project" ->
                %{
                  project: item,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  reposts_count: reposts_count,
                  liked: liked,
                  bookmarked: bookmarked,
                  reposted: reposted
                }
            end
          end)

        render(conn, :index, items: items)
    end
  end

  def reposts(conn, %{"username" => username} = params) do
    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        limit = String.to_integer(Map.get(params, "limit", "20"))
        offset = String.to_integer(Map.get(params, "offset", "0"))
        current_user = conn.assigns[:current_user]

        reposts = Social.list_user_reposts(user.id, limit: limit, offset: offset)

        # Convert reposts to feed format with actual counts and engagement status
        items =
          Enum.map(reposts, fn %{type: type, item: item} ->
            likes_count = Social.get_likes_count(type, item.id)
            reposts_count = Social.get_reposts_count(type, item.id)
            comments_count = Content.get_comments_count(type, item.id)

            # Get engagement status if user is authenticated
            {liked, bookmarked, reposted} =
              if current_user do
                {
                  Social.has_liked?(current_user.id, type, item.id),
                  Social.has_bookmarked?(current_user.id, type, item.id),
                  Social.has_reposted?(current_user.id, type, item.id)
                }
              else
                {false, false, false}
              end

            case type do
              "Post" ->
                %{
                  post: item,
                  user: item.user,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  reposts_count: reposts_count,
                  liked: liked,
                  bookmarked: bookmarked,
                  reposted: reposted
                }

              "Project" ->
                %{
                  project: item,
                  likes_count: likes_count,
                  comments_count: comments_count,
                  reposts_count: reposts_count,
                  liked: liked,
                  bookmarked: bookmarked,
                  reposted: reposted
                }
            end
          end)

        render(conn, :index, items: items)
    end
  end

  def follow(conn, %{"username" => username}) do
    current_user = conn.assigns[:current_user]

    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        case Social.follow(current_user.id, user.id) do
          {:ok, _follow} ->
            json(conn, %{success: true, following: true})

          {:error, _changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "Unable to follow user"})
        end
    end
  end

  def unfollow(conn, %{"username" => username}) do
    current_user = conn.assigns[:current_user]

    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        case Social.unfollow(current_user.id, user.id) do
          {:ok, _follow} ->
            json(conn, %{success: true, following: false})

          {:error, :not_found} ->
            conn
            |> put_status(:not_found)
            |> json(%{error: "Not following user"})

          {:error, _} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "Unable to unfollow user"})
        end
    end
  end

  def suggested(conn, params) do
    limit = String.to_integer(Map.get(params, "limit", "3"))
    current_user = conn.assigns[:current_user]
    context = Map.get(params, "context", "sidebar")

    users =
      if current_user do
        # Use sophisticated multi-signal algorithm for authenticated users
        Backend.Recommendations.suggested_users(
          current_user.id,
          limit: limit,
          context: context
        )
      else
        # Fallback to simple popular users for non-authenticated
        Accounts.list_suggested_users(
          limit: limit,
          exclude_user_id: nil
        )
      end

    render(conn, :index, users: users)
  end

  def search(conn, %{"q" => query} = params) do
    limit = String.to_integer(Map.get(params, "limit", "10"))
    current_user = conn.assigns[:current_user]

    users =
      Accounts.search_users(
        query,
        limit: limit,
        exclude_user_id: current_user && current_user.id
      )

    render(conn, :index, users: users)
  end

  def check_username(conn, %{"username" => username}) do
    current_user = conn.assigns[:current_user]
    available = Accounts.username_available?(username, current_user.id)

    json(conn, %{available: available})
  end

  def reviews(conn, %{"username" => username} = params) do
    case Accounts.get_user_by_username(username) do
      nil ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      user ->
        limit = String.to_integer(Map.get(params, "limit", "20"))
        offset = String.to_integer(Map.get(params, "offset", "0"))

        reviews = Backend.Gigs.get_user_reviews(user.id, limit: limit, offset: offset)
        rating = Backend.Gigs.get_user_rating(user.id)

        conn
        |> put_view(json: BackendWeb.GigJSON)
        |> render(:reviews, reviews: reviews)
        |> Map.put(:rating, rating)
    end
  end

  # Helper function to add engagement status to items
  defp add_engagement_status(items, user_id, item_type) do
    Enum.map(items, fn item ->
      item_id =
        case item_type do
          "Post" -> item.post.id
          "Project" -> item.project.id
        end

      item
      |> Map.put(:liked, Social.has_liked?(user_id, item_type, item_id))
      |> Map.put(:bookmarked, Social.has_bookmarked?(user_id, item_type, item_id))
      |> Map.put(:reposted, Social.has_reposted?(user_id, item_type, item_id))
    end)
  end
end
