defmodule Backend.Engagement do
  @moduledoc """
  Context module for managing simulated engagement system.

  This module provides functions to manage bot users, app settings,
  engagement logs, and curated content for the simulated human engagement system.
  """

  import Ecto.Query
  alias Backend.Repo
  alias Backend.Engagement.{AppSetting, EngagementBotUser, SimulatedEngagementLog, CuratedContent, AvatarGenerator}
  alias Backend.Accounts
  alias Backend.Accounts.User

  require Logger

  # =============================================================================
  # App Settings
  # =============================================================================

  @doc "Get a setting by key"
  def get_setting(key) do
    Repo.get_by(AppSetting, key: key)
  end

  @doc "Get setting value, with optional default"
  def get_setting_value(key, default \\ nil) do
    case get_setting(key) do
      nil -> default
      setting -> setting.value
    end
  end

  @doc "Check if simulated engagement is enabled"
  def engagement_enabled? do
    case get_setting_value("simulated_engagement") do
      %{"enabled" => true} -> true
      _ -> false
    end
  end

  @doc "Get engagement intensity setting"
  def engagement_intensity do
    case get_setting_value("simulated_engagement") do
      %{"intensity" => intensity} when intensity in ["low", "medium", "high"] -> intensity
      _ -> "medium"
    end
  end

  @doc "Check if bot project creation is enabled"
  def bot_projects_enabled? do
    case get_setting_value("simulated_engagement") do
      %{"bot_projects_enabled" => true} -> true
      _ -> false
    end
  end

  @doc "Get bot project frequency (projects per day)"
  def bot_project_frequency do
    case get_setting_value("simulated_engagement") do
      %{"bot_project_frequency" => freq} when is_integer(freq) and freq > 0 -> freq
      _ -> 2  # Default: 2 bot projects per day
    end
  end

  @doc "Check if bot text posts are enabled"
  def bot_posts_enabled? do
    case get_setting_value("simulated_engagement") do
      %{"bot_posts_enabled" => true} -> true
      _ -> false
    end
  end

  @doc "Get bot post frequency (posts per day)"
  def bot_post_frequency do
    case get_setting_value("simulated_engagement") do
      %{"bot_post_frequency" => freq} when is_integer(freq) and freq > 0 -> freq
      _ -> 5  # Default: 5 bot posts per day
    end
  end

  @doc "Create or update a setting"
  def upsert_setting(key, value, description \\ nil) do
    case get_setting(key) do
      nil ->
        %AppSetting{}
        |> AppSetting.changeset(%{key: key, value: value, description: description})
        |> Repo.insert()

      setting ->
        setting
        |> AppSetting.changeset(%{value: value, description: description || setting.description})
        |> Repo.update()
    end
  end

  @doc "Update engagement settings"
  def update_engagement_settings(attrs) do
    current = get_setting_value("simulated_engagement", %{})
    updated = Map.merge(current, attrs)
    upsert_setting("simulated_engagement", updated, "Simulated engagement system settings")
  end

  @doc "List all settings"
  def list_settings do
    Repo.all(AppSetting)
  end

  # =============================================================================
  # Bot Users
  # =============================================================================

  @doc "List all bot users with their associated user records"
  def list_bot_users(opts \\ []) do
    limit = Keyword.get(opts, :limit, 100)
    offset = Keyword.get(opts, :offset, 0)
    active_only = Keyword.get(opts, :active_only, false)

    query =
      from b in EngagementBotUser,
        join: u in User,
        on: b.user_id == u.id,
        order_by: [desc: b.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [user: u]

    query =
      if active_only do
        where(query, [b], b.is_active == true)
      else
        query
      end

    Repo.all(query)
  end

  @doc "Count total bot users"
  def count_bot_users(opts \\ []) do
    active_only = Keyword.get(opts, :active_only, false)

    query = from(b in EngagementBotUser)

    query =
      if active_only do
        where(query, [b], b.is_active == true)
      else
        query
      end

    Repo.aggregate(query, :count)
  end

  @doc "Get a bot user by ID"
  def get_bot_user(id) do
    Repo.get(EngagementBotUser, id)
    |> Repo.preload(:user)
  end

  @doc "Get a bot user by user_id"
  def get_bot_user_by_user_id(user_id) do
    Repo.get_by(EngagementBotUser, user_id: user_id)
    |> case do
      nil -> nil
      bot -> Repo.preload(bot, :user)
    end
  end

  @doc "Create a new bot user"
  def create_bot_user(attrs) do
    %EngagementBotUser{}
    |> EngagementBotUser.changeset(attrs)
    |> Repo.insert()
  end

  @doc "Update a bot user"
  def update_bot_user(%EngagementBotUser{} = bot_user, attrs) do
    bot_user
    |> EngagementBotUser.changeset(attrs)
    |> Repo.update()
  end

  @doc "Delete a bot user (and optionally the underlying user)"
  def delete_bot_user(%EngagementBotUser{} = bot_user, delete_user \\ false) do
    Repo.transaction(fn ->
      case Repo.delete(bot_user) do
        {:ok, deleted} ->
          if delete_user do
            case Repo.get(User, bot_user.user_id) do
              nil -> :ok
              user -> Repo.delete(user)
            end
          end

          deleted

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc "Toggle bot user active status"
  def toggle_bot_user_active(%EngagementBotUser{} = bot_user) do
    update_bot_user(bot_user, %{is_active: !bot_user.is_active})
  end

  @doc "Increment engagement count for a bot"
  def increment_bot_engagement(%EngagementBotUser{} = bot_user) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    bot_user
    |> EngagementBotUser.engagement_changeset(%{
      engagements_today: bot_user.engagements_today + 1,
      total_engagements: bot_user.total_engagements + 1,
      last_engaged_at: now
    })
    |> Repo.update()
  end

  @doc "Reset daily engagement counters for all bots"
  def reset_daily_engagement_counters do
    {count, _} =
      from(b in EngagementBotUser)
      |> Repo.update_all(set: [engagements_today: 0])

    Logger.info("Reset daily engagement counters for #{count} bots")
    {:ok, count}
  end

  @doc "Get available bots for engagement at current time"
  def get_available_bots(count, exclude_target_id \\ nil) do
    now = DateTime.utc_now()
    current_hour = now.hour
    current_day = Date.day_of_week(DateTime.to_date(now), :sunday)

    query =
      from b in EngagementBotUser,
        where: b.is_active == true,
        where: ^current_hour in b.preferred_hours,
        where: ^current_day in b.active_days,
        where: b.engagements_today < b.daily_engagement_limit,
        preload: [:user]

    # If we need to exclude bots that already engaged with this target
    query =
      if exclude_target_id do
        from b in query,
          left_join: l in SimulatedEngagementLog,
          on:
            l.bot_user_id == b.id and l.target_id == ^exclude_target_id and
              l.status in ["pending", "scheduled", "executed"],
          where: is_nil(l.id)
      else
        query
      end

    available = Repo.all(query)
    Enum.take_random(available, min(count, length(available)))
  end

  # =============================================================================
  # Engagement Logs
  # =============================================================================

  @doc "Create an engagement log entry"
  def create_engagement_log(attrs) do
    %SimulatedEngagementLog{}
    |> SimulatedEngagementLog.changeset(attrs)
    |> Repo.insert()
  end

  @doc "Get pending engagement logs ready for execution"
  def get_pending_engagements(limit \\ 50) do
    now = DateTime.utc_now()

    from(l in SimulatedEngagementLog,
      where: l.status == "pending",
      where: l.scheduled_for <= ^now,
      order_by: [asc: l.scheduled_for],
      limit: ^limit,
      preload: [:bot_user]
    )
    |> Repo.all()
  end

  @doc "Mark engagement as executed"
  def mark_engagement_executed(%SimulatedEngagementLog{} = log, metadata \\ %{}) do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    log
    |> SimulatedEngagementLog.execution_changeset(%{
      status: "executed",
      executed_at: now,
      metadata: Map.merge(log.metadata || %{}, metadata)
    })
    |> Repo.update()
  end

  @doc "Mark engagement as failed"
  def mark_engagement_failed(%SimulatedEngagementLog{} = log, reason) do
    log
    |> SimulatedEngagementLog.execution_changeset(%{
      status: "failed",
      metadata: Map.put(log.metadata || %{}, "failure_reason", reason)
    })
    |> Repo.update()
  end

  @doc "Mark engagement as skipped"
  def mark_engagement_skipped(%SimulatedEngagementLog{} = log, reason) do
    log
    |> SimulatedEngagementLog.execution_changeset(%{
      status: "skipped",
      metadata: Map.put(log.metadata || %{}, "skip_reason", reason)
    })
    |> Repo.update()
  end

  @doc "List engagement logs with filters"
  def list_engagement_logs(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    status = Keyword.get(opts, :status)
    engagement_type = Keyword.get(opts, :engagement_type)
    bot_user_id = Keyword.get(opts, :bot_user_id)

    query =
      from l in SimulatedEngagementLog,
        order_by: [desc: l.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [bot_user: :user]

    query = if status, do: where(query, [l], l.status == ^status), else: query
    query = if engagement_type, do: where(query, [l], l.engagement_type == ^engagement_type), else: query
    query = if bot_user_id, do: where(query, [l], l.bot_user_id == ^bot_user_id), else: query

    Repo.all(query)
  end

  @doc "Count engagement logs by status"
  def count_engagement_logs_by_status do
    from(l in SimulatedEngagementLog,
      group_by: l.status,
      select: {l.status, count(l.id)}
    )
    |> Repo.all()
    |> Map.new()
  end

  @doc "Get engagement stats for today"
  def get_today_stats do
    today_start = DateTime.utc_now() |> DateTime.to_date() |> DateTime.new!(~T[00:00:00])

    executed_today =
      from(l in SimulatedEngagementLog,
        where: l.status == "executed",
        where: l.executed_at >= ^today_start
      )
      |> Repo.aggregate(:count)

    pending =
      from(l in SimulatedEngagementLog,
        where: l.status == "pending"
      )
      |> Repo.aggregate(:count)

    by_type =
      from(l in SimulatedEngagementLog,
        where: l.status == "executed",
        where: l.executed_at >= ^today_start,
        group_by: l.engagement_type,
        select: {l.engagement_type, count(l.id)}
      )
      |> Repo.all()
      |> Map.new()

    %{
      executed_today: executed_today,
      pending: pending,
      by_type: by_type
    }
  end

  @doc "Check if bot has already engaged with target"
  def bot_already_engaged?(bot_user_id, target_type, target_id, engagement_type) do
    from(l in SimulatedEngagementLog,
      where: l.bot_user_id == ^bot_user_id,
      where: l.target_type == ^target_type,
      where: l.target_id == ^target_id,
      where: l.engagement_type == ^engagement_type,
      where: l.status in ["pending", "scheduled", "executed"]
    )
    |> Repo.exists?()
  end

  # =============================================================================
  # Curated Content
  # =============================================================================

  @doc "List active curated content"
  def list_curated_content(opts \\ []) do
    limit = Keyword.get(opts, :limit, 50)
    offset = Keyword.get(opts, :offset, 0)
    active_only = Keyword.get(opts, :active_only, true)

    now = DateTime.utc_now()

    query =
      from c in CuratedContent,
        order_by: [desc: c.priority, desc: c.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:added_by]

    query =
      if active_only do
        where(query, [c], c.is_active == true and (is_nil(c.expires_at) or c.expires_at > ^now))
      else
        query
      end

    Repo.all(query)
  end

  @doc "Get curated content for a specific piece of content"
  def get_curated_content(content_type, content_id) do
    now = DateTime.utc_now()

    from(c in CuratedContent,
      where: c.content_type == ^content_type,
      where: c.content_id == ^content_id,
      where: c.is_active == true,
      where: is_nil(c.expires_at) or c.expires_at > ^now
    )
    |> Repo.one()
  end

  @doc "Create curated content entry"
  def create_curated_content(attrs) do
    %CuratedContent{}
    |> CuratedContent.changeset(attrs)
    |> Repo.insert()
  end

  @doc "Update curated content"
  def update_curated_content(%CuratedContent{} = curated, attrs) do
    curated
    |> CuratedContent.changeset(attrs)
    |> Repo.update()
  end

  @doc "Delete curated content"
  def delete_curated_content(%CuratedContent{} = curated) do
    Repo.delete(curated)
  end

  @doc "Get curated content by ID"
  def get_curated_content_by_id(id) do
    Repo.get(CuratedContent, id)
    |> Repo.preload(:added_by)
  end

  # =============================================================================
  # Bot User Generation
  # =============================================================================

  @doc "Generate a new bot user with randomized persona and AI-generated avatar"
  def generate_bot_user(opts \\ []) do
    persona_type = Keyword.get(opts, :persona_type, random_persona_type())
    username = Keyword.get(opts, :username, generate_bot_username())
    display_name = Keyword.get(opts, :display_name, generate_bot_display_name())

    # Generate AI avatar (with fallback to placeholder)
    Logger.info("Generating AI avatar for new bot: #{display_name}")
    {:ok, avatar_url} = AvatarGenerator.generate_avatar_with_fallback(display_name, persona_type)

    Repo.transaction(fn ->
      # Create the user account first
      user_attrs = %{
        username: username,
        display_name: display_name,
        bio: generate_bot_bio(persona_type),
        avatar_url: avatar_url,
        is_system_bot: true,
        has_onboarded: true
      }

      case Accounts.create_bot_user(user_attrs) do
        {:ok, user} ->
          # Create the bot user configuration
          bot_attrs = %{
            user_id: user.id,
            persona_type: persona_type,
            activity_level: persona_to_activity_level(persona_type),
            preferred_hours: EngagementBotUser.default_preferred_hours(persona_type),
            active_days: EngagementBotUser.default_active_days(persona_type),
            engagement_style: EngagementBotUser.default_engagement_style(persona_type),
            daily_engagement_limit: EngagementBotUser.default_daily_limit(persona_type),
            is_active: true
          }

          case create_bot_user(bot_attrs) do
            {:ok, bot_user} ->
              Repo.preload(bot_user, :user)

            {:error, changeset} ->
              Repo.rollback(changeset)
          end

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  defp random_persona_type do
    # Distribution: 30% enthusiast, 40% casual, 20% supportive, 10% lurker
    rand = :rand.uniform(100)

    cond do
      rand <= 30 -> "enthusiast"
      rand <= 70 -> "casual"
      rand <= 90 -> "supportive"
      true -> "lurker"
    end
  end

  defp persona_to_activity_level(persona_type) do
    case persona_type do
      "enthusiast" -> "high"
      "casual" -> "medium"
      "supportive" -> "medium"
      "lurker" -> "low"
      _ -> "medium"
    end
  end

  defp generate_bot_username do
    prefixes = ~w(dev code tech build make hack ship launch create craft pixel byte)
    suffixes = ~w(ninja master pro wizard guru hero maker smith labs forge)
    numbers = ["", "", "", to_string(Enum.random(1..999))]

    prefix = Enum.random(prefixes)
    suffix = Enum.random(suffixes)
    number = Enum.random(numbers)

    "#{prefix}#{suffix}#{number}"
  end

  defp generate_bot_display_name do
    first_names = ~w(Alex Jordan Taylor Morgan Casey Riley Quinn Avery Parker Drew)
    last_names = ~w(Chen Kim Park Lee Wang Wu Singh Patel Garcia Lopez)

    "#{Enum.random(first_names)} #{Enum.random(last_names)}"
  end

  defp generate_bot_bio(persona_type) do
    bios = %{
      "enthusiast" => [
        "Building cool stuff with code ✨",
        "Full-stack developer | Open source contributor",
        "Passionate about creating great software",
        "Always learning, always building"
      ],
      "casual" => [
        "Developer | Coffee enthusiast",
        "Writing code, one line at a time",
        "Tech curious",
        "Learning in public"
      ],
      "supportive" => [
        "Here to support fellow devs 💪",
        "Community > Competition",
        "Love seeing what everyone is building",
        "Lifting others up"
      ],
      "lurker" => [
        "👀",
        "Observing",
        "Quietly coding",
        ""
      ]
    }

    Enum.random(Map.get(bios, persona_type, ["Developer"]))
  end
end
