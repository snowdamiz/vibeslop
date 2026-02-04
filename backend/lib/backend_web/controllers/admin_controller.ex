defmodule BackendWeb.AdminController do
  use BackendWeb, :controller
  import Ecto.Query
  alias Backend.Accounts
  alias Backend.Engagement

  plug :require_admin

  # Middleware to ensure only admins can access
  defp require_admin(conn, _opts) do
    user = conn.assigns[:current_user]
    
    if user && Accounts.is_admin?(user) do
      conn
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "forbidden", message: "Admin access required"})
      |> halt()
    end
  end

  def list_users(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    search = Map.get(params, "search", "")

    users = Accounts.list_users(limit: limit, offset: offset, search: search)
    total = Accounts.count_users(search: search)

    json(conn, %{
      data: Enum.map(users, &user_to_admin_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def toggle_verified(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, updated_user} = Accounts.toggle_verified(user)
        json(conn, %{data: user_to_admin_json(updated_user)})
    end
  end

  def delete_user(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, _} = Accounts.delete_user(user)
        send_resp(conn, :no_content, "")
    end
  end

  defp user_to_admin_json(user) do
    %{
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      has_onboarded: user.has_onboarded,
      inserted_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end

  # AI Tools CRUD
  def create_ai_tool(conn, %{"name" => name}) do
    alias Backend.Catalog.AiTool
    slug = slugify(name)

    changeset = AiTool.changeset(%AiTool{}, %{name: name, slug: slug})

    case Backend.Repo.insert(changeset) do
      {:ok, tool} ->
        conn
        |> put_status(:created)
        |> json(%{data: %{id: tool.id, name: tool.name, slug: tool.slug}})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_ai_tool(conn, %{"id" => id}) do
    alias Backend.Catalog.AiTool

    case Backend.Repo.get(AiTool, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "AI tool not found"})

      tool ->
        {:ok, _} = Backend.Repo.delete(tool)
        send_resp(conn, :no_content, "")
    end
  end

  # Tech Stacks CRUD
  def create_tech_stack(conn, %{"name" => name} = params) do
    alias Backend.Catalog.TechStack
    slug = slugify(name)
    category = Map.get(params, "category", "other")

    changeset = TechStack.changeset(%TechStack{}, %{name: name, slug: slug, category: category})

    case Backend.Repo.insert(changeset) do
      {:ok, stack} ->
        conn
        |> put_status(:created)
        |> json(%{data: %{id: stack.id, name: stack.name, slug: stack.slug, category: stack.category}})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_tech_stack(conn, %{"id" => id}) do
    alias Backend.Catalog.TechStack

    case Backend.Repo.get(TechStack, id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Tech stack not found"})

      stack ->
        {:ok, _} = Backend.Repo.delete(stack)
        send_resp(conn, :no_content, "")
    end
  end

  # Report Management
  def list_reports(conn, params) do
    limit = Map.get(params, "limit", "20") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    status = Map.get(params, "status")
    type = Map.get(params, "type")

    reports = Backend.Social.list_reports(limit: limit, offset: offset, status: status, type: type)
    total = Backend.Social.count_reports(status: status, type: type)

    json(conn, %{
      data: Enum.map(reports, &report_to_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def update_report(conn, %{"id" => id, "status" => status}) do
    case Backend.Social.update_report_status(id, status) do
      {:ok, report} ->
        report = Backend.Repo.preload(report, [:user])
        json(conn, %{data: report_to_json(report)})

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Report not found"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_content(conn, %{"id" => id}) do
    case Backend.Social.get_report(id) do
      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Report not found"})

      {:ok, report} ->
        # Delete the reported content based on type
        delete_result =
          case report.reportable_type do
            "Post" -> Backend.Content.admin_delete_post(report.reportable_id)
            "Project" -> Backend.Content.admin_delete_project(report.reportable_id)
            "Comment" -> Backend.Content.admin_delete_comment(report.reportable_id)
            "Gig" -> Backend.Gigs.admin_delete_gig(report.reportable_id)
            _ -> {:error, :unknown_type}
          end

        case delete_result do
          {:ok, _} ->
            # Mark report as resolved
            Backend.Social.update_report_status(id, "resolved")
            json(conn, %{success: true})

          {:error, :not_found} ->
            # Content already deleted, still mark as resolved
            Backend.Social.update_report_status(id, "resolved")
            json(conn, %{success: true, message: "Content already deleted"})

          {:error, _reason} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "delete_failed", message: "Failed to delete content"})
        end
    end
  end

  defp report_to_json(report) do
    %{
      id: report.id,
      reportable_type: report.reportable_type,
      reportable_id: report.reportable_id,
      status: report.status,
      inserted_at: report.inserted_at,
      reporter: %{
        id: report.user.id,
        username: report.user.username,
        display_name: report.user.display_name,
        avatar_url: report.user.avatar_url
      }
    }
  end

  defp format_errors(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Enum.reduce(opts, msg, fn {key, value}, acc ->
        String.replace(acc, "%{#{key}}", to_string(value))
      end)
    end)
  end

  defp slugify(name) do
    name
    |> String.downcase()
    |> String.replace(~r/[^a-z0-9\s-]/, "")
    |> String.replace(~r/\s+/, "-")
    |> String.trim("-")
  end

  # Bot Post Management
  def list_bot_posts(conn, params) do
    limit = Map.get(params, "limit", "20") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()

    bot_posts = Backend.Bot.list_bot_posts(limit: limit, offset: offset)
    total = Backend.Bot.count_bot_posts()

    json(conn, %{
      data: Enum.map(bot_posts, &bot_post_to_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def trigger_trending_post(conn, _params) do
    case Backend.Bot.TrendingPost.generate() do
      {:ok, post} ->
        json(conn, %{success: true, post_id: post.id})

      {:error, :no_trending_projects} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "no_trending_projects", message: "No trending projects found"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "creation_failed", errors: format_errors(changeset)})
    end
  end

  def delete_bot_post(conn, %{"id" => id}) do
    case Backend.Bot.delete_bot_post(id) do
      {:ok, _bot_post} ->
        send_resp(conn, :no_content, "")

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Bot post not found"})
    end
  end

  defp bot_post_to_json(bot_post) do
    %{
      id: bot_post.id,
      bot_type: bot_post.bot_type,
      metadata: bot_post.metadata,
      post: %{
        id: bot_post.post.id,
        content: bot_post.post.content,
        inserted_at: bot_post.post.inserted_at
      },
      inserted_at: bot_post.inserted_at
    }
  end

  # Sync OpenRouter Models
  def sync_openrouter_models(conn, _params) do
    alias Backend.Catalog.AiTool

    case fetch_openrouter_models() do
      {:ok, models} ->
        # Get existing AI tool slugs to avoid duplicates
        existing_slugs =
          Backend.Repo.all(from t in AiTool, select: t.slug)
          |> MapSet.new()

        # Insert new models
        {created_count, skipped_count} =
          Enum.reduce(models, {0, 0}, fn model, {created, skipped} ->
            name = model["name"] || model["id"]
            slug = slugify(model["id"] || name)

            if MapSet.member?(existing_slugs, slug) do
              {created, skipped + 1}
            else
              changeset = AiTool.changeset(%AiTool{}, %{name: name, slug: slug})

              case Backend.Repo.insert(changeset) do
                {:ok, _} -> {created + 1, skipped}
                {:error, _} -> {created, skipped + 1}
              end
            end
          end)

        json(conn, %{
          success: true,
          created: created_count,
          skipped: skipped_count,
          total: length(models)
        })

      {:error, reason} ->
        conn
        |> put_status(:bad_gateway)
        |> json(%{error: "openrouter_fetch_failed", message: reason})
    end
  end

  defp fetch_openrouter_models do
    url = "https://openrouter.ai/api/v1/models"

    case :httpc.request(:get, {String.to_charlist(url), []}, [], []) do
      {:ok, {{_, 200, _}, _headers, body}} ->
        case Jason.decode(to_string(body)) do
          {:ok, %{"data" => models}} -> {:ok, models}
          {:ok, _} -> {:error, "Unexpected response format"}
          {:error, _} -> {:error, "Failed to parse JSON response"}
        end

      {:ok, {{_, status, _}, _, _}} ->
        {:error, "OpenRouter API returned status #{status}"}

      {:error, reason} ->
        {:error, "HTTP request failed: #{inspect(reason)}"}
    end
  end

  # =============================================================================
  # Simulated Engagement Management
  # =============================================================================

  def get_engagement_settings(conn, _params) do
    settings = Engagement.get_setting_value("simulated_engagement", %{})

    json(conn, %{
      data: %{
        enabled: Map.get(settings, "enabled", false),
        intensity: Map.get(settings, "intensity", "medium"),
        bot_projects_enabled: Map.get(settings, "bot_projects_enabled", false),
        bot_project_frequency: Map.get(settings, "bot_project_frequency", 2),
        bot_posts_enabled: Map.get(settings, "bot_posts_enabled", false),
        bot_post_frequency: Map.get(settings, "bot_post_frequency", 5)
      }
    })
  end

  def update_engagement_settings(conn, params) do
    enabled = Map.get(params, "enabled")
    intensity = Map.get(params, "intensity")
    bot_projects_enabled = Map.get(params, "bot_projects_enabled")
    bot_project_frequency = Map.get(params, "bot_project_frequency")
    bot_posts_enabled = Map.get(params, "bot_posts_enabled")
    bot_post_frequency = Map.get(params, "bot_post_frequency")

    attrs =
      %{}
      |> maybe_put("enabled", enabled)
      |> maybe_put("intensity", intensity)
      |> maybe_put("bot_projects_enabled", bot_projects_enabled)
      |> maybe_put("bot_project_frequency", bot_project_frequency)
      |> maybe_put("bot_posts_enabled", bot_posts_enabled)
      |> maybe_put("bot_post_frequency", bot_post_frequency)

    case Engagement.update_engagement_settings(attrs) do
      {:ok, setting} ->
        json(conn, %{
          data: %{
            enabled: Map.get(setting.value, "enabled", false),
            intensity: Map.get(setting.value, "intensity", "medium"),
            bot_projects_enabled: Map.get(setting.value, "bot_projects_enabled", false),
            bot_project_frequency: Map.get(setting.value, "bot_project_frequency", 2),
            bot_posts_enabled: Map.get(setting.value, "bot_posts_enabled", false),
            bot_post_frequency: Map.get(setting.value, "bot_post_frequency", 5)
          }
        })

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "validation_failed", errors: format_errors(changeset)})
    end
  end

  def list_engagement_bots(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()

    bots = Engagement.list_bot_users(limit: limit, offset: offset)
    total = Engagement.count_bot_users()

    json(conn, %{
      data: Enum.map(bots, &bot_user_to_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def create_engagement_bot(conn, params) do
    opts =
      []
      |> maybe_add_opt(:persona_type, params["persona_type"])
      |> maybe_add_opt(:username, params["username"])
      |> maybe_add_opt(:display_name, params["display_name"])

    case Engagement.generate_bot_user(opts) do
      {:ok, bot_user} ->
        conn
        |> put_status(:created)
        |> json(%{data: bot_user_to_json(bot_user)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "creation_failed", errors: format_errors(changeset)})
    end
  end

  def update_engagement_bot(conn, %{"id" => id} = params) do
    case Engagement.get_bot_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Bot user not found"})

      bot_user ->
        attrs =
          %{}
          |> maybe_put(:persona_type, params["persona_type"])
          |> maybe_put(:activity_level, params["activity_level"])
          |> maybe_put(:daily_engagement_limit, params["daily_engagement_limit"])
          |> maybe_put(:preferred_hours, params["preferred_hours"])
          |> maybe_put(:active_days, params["active_days"])
          |> maybe_put(:is_active, params["is_active"])

        case Engagement.update_bot_user(bot_user, attrs) do
          {:ok, updated} ->
            updated = Backend.Repo.preload(updated, :user)
            json(conn, %{data: bot_user_to_json(updated)})

          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "validation_failed", errors: format_errors(changeset)})
        end
    end
  end

  def delete_engagement_bot(conn, %{"id" => id}) do
    case Engagement.get_bot_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Bot user not found"})

      bot_user ->
        case Engagement.delete_bot_user(bot_user, true) do
          {:ok, _} ->
            send_resp(conn, :no_content, "")

          {:error, _} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "delete_failed", message: "Failed to delete bot user"})
        end
    end
  end

  def toggle_engagement_bot(conn, %{"id" => id}) do
    case Engagement.get_bot_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Bot user not found"})

      bot_user ->
        case Engagement.toggle_bot_user_active(bot_user) do
          {:ok, updated} ->
            updated = Backend.Repo.preload(updated, :user)
            json(conn, %{data: bot_user_to_json(updated)})

          {:error, changeset} ->
            conn
            |> put_status(:unprocessable_entity)
            |> json(%{error: "validation_failed", errors: format_errors(changeset)})
        end
    end
  end

  def engagement_stats(conn, _params) do
    today_stats = Engagement.get_today_stats()
    status_counts = Engagement.count_engagement_logs_by_status()
    active_bots = Engagement.count_bot_users(active_only: true)
    total_bots = Engagement.count_bot_users()

    json(conn, %{
      data: %{
        executed_today: today_stats.executed_today,
        pending: today_stats.pending,
        by_type: today_stats.by_type,
        status_counts: status_counts,
        active_bots: active_bots,
        total_bots: total_bots
      }
    })
  end

  def list_engagement_logs(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    status = Map.get(params, "status")
    engagement_type = Map.get(params, "engagement_type")

    logs =
      Engagement.list_engagement_logs(
        limit: limit,
        offset: offset,
        status: status,
        engagement_type: engagement_type
      )

    json(conn, %{
      data: Enum.map(logs, &engagement_log_to_json/1),
      meta: %{limit: limit, offset: offset}
    })
  end

  def list_curated_content(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    active_only = Map.get(params, "active_only", "true") == "true"

    curated = Engagement.list_curated_content(limit: limit, offset: offset, active_only: active_only)

    json(conn, %{
      data: Enum.map(curated, &curated_content_to_json/1),
      meta: %{limit: limit, offset: offset}
    })
  end

  def add_curated_content(conn, params) do
    user = conn.assigns[:current_user]

    attrs = %{
      content_type: params["content_type"],
      content_id: params["content_id"],
      priority: params["priority"] || 3,
      engagement_multiplier: params["engagement_multiplier"] || 1.5,
      added_by_id: user.id,
      expires_at: parse_datetime(params["expires_at"]),
      is_active: true
    }

    case Engagement.create_curated_content(attrs) do
      {:ok, curated} ->
        curated = Backend.Repo.preload(curated, :added_by)

        conn
        |> put_status(:created)
        |> json(%{data: curated_content_to_json(curated)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "creation_failed", errors: format_errors(changeset)})
    end
  end

  def remove_curated_content(conn, %{"id" => id}) do
    case Engagement.get_curated_content_by_id(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "Curated content not found"})

      curated ->
        case Engagement.delete_curated_content(curated) do
          {:ok, _} ->
            send_resp(conn, :no_content, "")

          {:error, _} ->
            conn
            |> put_status(:internal_server_error)
            |> json(%{error: "delete_failed", message: "Failed to delete curated content"})
        end
    end
  end

  defp bot_user_to_json(bot_user) do
    %{
      id: bot_user.id,
      persona_type: bot_user.persona_type,
      activity_level: bot_user.activity_level,
      preferred_hours: bot_user.preferred_hours,
      active_days: bot_user.active_days,
      engagement_style: bot_user.engagement_style,
      daily_engagement_limit: bot_user.daily_engagement_limit,
      engagements_today: bot_user.engagements_today,
      total_engagements: bot_user.total_engagements,
      last_engaged_at: bot_user.last_engaged_at,
      is_active: bot_user.is_active,
      inserted_at: bot_user.inserted_at,
      user: %{
        id: bot_user.user.id,
        username: bot_user.user.username,
        display_name: bot_user.user.display_name,
        avatar_url: bot_user.user.avatar_url
      }
    }
  end

  defp engagement_log_to_json(log) do
    %{
      id: log.id,
      engagement_type: log.engagement_type,
      target_type: log.target_type,
      target_id: log.target_id,
      scheduled_for: log.scheduled_for,
      executed_at: log.executed_at,
      status: log.status,
      metadata: log.metadata,
      inserted_at: log.inserted_at,
      bot_user: if(log.bot_user, do: %{
        id: log.bot_user.id,
        persona_type: log.bot_user.persona_type,
        user: if(log.bot_user.user, do: %{
          username: log.bot_user.user.username,
          display_name: log.bot_user.user.display_name,
          avatar_url: log.bot_user.user.avatar_url
        })
      })
    }
  end

  defp curated_content_to_json(curated) do
    %{
      id: curated.id,
      content_type: curated.content_type,
      content_id: curated.content_id,
      priority: curated.priority,
      engagement_multiplier: curated.engagement_multiplier,
      expires_at: curated.expires_at,
      is_active: curated.is_active,
      inserted_at: curated.inserted_at,
      added_by: if(curated.added_by, do: %{
        id: curated.added_by.id,
        username: curated.added_by.username,
        display_name: curated.added_by.display_name
      })
    }
  end

  defp maybe_put(map, _key, nil), do: map
  defp maybe_put(map, key, value), do: Map.put(map, key, value)

  defp maybe_add_opt(opts, _key, nil), do: opts
  defp maybe_add_opt(opts, key, value), do: Keyword.put(opts, key, value)

  defp parse_datetime(nil), do: nil
  defp parse_datetime(datetime_string) when is_binary(datetime_string) do
    case DateTime.from_iso8601(datetime_string) do
      {:ok, datetime, _} -> datetime
      _ -> nil
    end
  end
  defp parse_datetime(_), do: nil

  # =============================================================================
  # Engagement Trigger Endpoints (for immediate testing)
  # =============================================================================

  @doc """
  Manually trigger a content scan to schedule engagement for any new content.
  """
  def trigger_content_scan(conn, _params) do
    alias Backend.Engagement.Workers.NewContentWatcherWorker

    case NewContentWatcherWorker.trigger_scan() do
      {:ok, job} ->
        json(conn, %{success: true, message: "Content scan triggered", job_id: job.id})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "trigger_failed", message: inspect(reason)})
    end
  end

  @doc """
  Manually trigger bot post creation.
  """
  def trigger_bot_post(conn, params) do
    alias Backend.Engagement.Workers.BotPostWorker

    bot_user_id = Map.get(params, "bot_user_id")

    case BotPostWorker.trigger_post(bot_user_id) do
      {:ok, job} ->
        json(conn, %{success: true, message: "Bot post triggered", job_id: job.id})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "trigger_failed", message: inspect(reason)})
    end
  end

  @doc """
  Manually trigger bot project creation.
  """
  def trigger_bot_project(conn, params) do
    alias Backend.Engagement.Workers.BotProjectWorker

    bot_user_id = Map.get(params, "bot_user_id")

    case BotProjectWorker.trigger_project(bot_user_id) do
      {:ok, job} ->
        json(conn, %{success: true, message: "Bot project triggered", job_id: job.id})

      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{error: "trigger_failed", message: inspect(reason)})
    end
  end

  @doc """
  Trigger engagement for existing content (backfill).
  Schedules engagement for recent posts/projects that haven't been engaged with yet.
  """
  def trigger_engagement_backfill(conn, params) do
    alias Backend.Content.{Post, Project}
    alias Backend.Engagement.Workers.EngagementSchedulerWorker

    hours_back = Map.get(params, "hours_back", 24) |> to_integer()
    limit = Map.get(params, "limit", 10) |> to_integer()
    since = DateTime.utc_now() |> DateTime.add(-hours_back, :hour)

    # Find recent posts without scheduled engagement
    posts_query =
      from(p in Post,
        join: u in assoc(p, :user),
        where: p.inserted_at > ^since,
        where: u.is_system_bot == false,
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        select: %{id: p.id, user_id: p.user_id, inserted_at: p.inserted_at}
      )

    posts = Backend.Repo.all(posts_query)

    # Find recent projects without scheduled engagement
    projects_query =
      from(p in Project,
        join: u in assoc(p, :user),
        where: p.inserted_at > ^since,
        where: u.is_system_bot == false,
        order_by: [desc: p.inserted_at],
        limit: ^limit,
        select: %{id: p.id, user_id: p.user_id, inserted_at: p.inserted_at}
      )

    projects = Backend.Repo.all(projects_query)

    # Schedule engagement for each
    scheduled_posts =
      Enum.map(posts, fn post ->
        EngagementSchedulerWorker.new(%{
          "content_type" => "Post",
          "content_id" => post.id,
          "author_id" => post.user_id,
          "created_at" => DateTime.to_iso8601(post.inserted_at),
          "multiplier" => 1.0
        })
        |> Oban.insert()
      end)
      |> Enum.filter(&match?({:ok, _}, &1))
      |> length()

    scheduled_projects =
      Enum.map(projects, fn project ->
        EngagementSchedulerWorker.new(%{
          "content_type" => "Project",
          "content_id" => project.id,
          "author_id" => project.user_id,
          "created_at" => DateTime.to_iso8601(project.inserted_at),
          "multiplier" => 1.0
        })
        |> Oban.insert()
      end)
      |> Enum.filter(&match?({:ok, _}, &1))
      |> length()

    json(conn, %{
      success: true,
      message: "Engagement backfill triggered",
      scheduled_posts: scheduled_posts,
      scheduled_projects: scheduled_projects,
      found_posts: length(posts),
      found_projects: length(projects)
    })
  end

  defp to_integer(value) when is_integer(value), do: value
  defp to_integer(value) when is_binary(value), do: String.to_integer(value)
end
