defmodule Backend.Feed do
  @moduledoc """
  The Feed context - handles feed generation with algorithmic ranking.

  Implements two feed types:
  - "for-you": Algorithmic feed using Twitter-style engagement weights + time decay
  - "following": Chronological feed from followed users

  Uses cursor-based pagination for efficient infinite scroll.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Content.{Post, Project}
  alias Backend.Social.{Follow, Repost}
  alias Backend.Gigs.Gig

  # Engagement weights - rebalanced to reduce gaming potential
  # Comments are weighted highest because they require effort and are hard to fake
  # Reposts reduced from 20 to 5 because they're one-click and easily gamed
  @engagement_weights %{
    comments: 10.0,   # Highest: requires effort, hard to fake
    quotes: 8.0,      # High: requires content creation
    reposts: 5.0,     # Medium: easy action, reduced from 20
    bookmarks: 4.0,   # Medium: private signal
    likes: 1.0        # Baseline
  }

  # Time decay gravity - higher = faster decay for older posts
  # 1.8 provides strong preference for recent content while still allowing
  # highly-engaged older posts to surface
  @time_decay_gravity 1.8

  # How far back to look for candidates (days)
  @candidate_window_days 7

  # Minimum number of items to show in feed before backfilling with older content
  @minimum_feed_items 30

  # Gigs appear less frequently than posts/projects in the feed
  @gig_dampening_factor 0.5

  # Freshness bonus for new content (decays over this many hours)
  # New posts with 0 engagement can still appear in feed
  # Extended to 6 hours with higher base to give new content time to gain traction
  @freshness_bonus_hours 6
  @freshness_bonus_base 10.0

  # Self-engagement discount factor (0 = fully discount, 1 = count normally)
  # Set to 0 to completely ignore self-likes/reposts/bookmarks in scoring
  @self_engagement_discount 0.0

  alias Backend.Feed.Cache

  @doc """
  Returns the "For You" algorithmic feed.

  Combines posts and projects, ranked by engagement score with time decay.

  Uses a progressive strategy to ensure sufficient content:
  1. First fetches recent items (7 days) ranked by engagement + time decay
  2. If fewer than 30 items, backfills with older items ranked by engagement only (no time decay)

  The first page (no cursor, no filters) is cached for 60 seconds for performance.

  Options:
  - :limit - Number of items to return (default 20)
  - :cursor - Pagination cursor (score:id format)
  - :current_user_id - For engagement status (liked, bookmarked, etc.)
  """
  def for_you_feed(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    cursor = Keyword.get(opts, :cursor)
    current_user_id = Keyword.get(opts, :current_user_id)
    ai_tool_ids = Keyword.get(opts, :ai_tool_ids, [])
    tech_stack_ids = Keyword.get(opts, :tech_stack_ids, [])

    # Check if this is a cacheable request (first page, no filters)
    cache_key = Cache.for_you_key(ai_tool_ids: ai_tool_ids, tech_stack_ids: tech_stack_ids)
    use_cache? = cursor == nil and cache_key != nil

    # Get base items (from cache or fresh)
    base_items =
      if use_cache? do
        case Cache.get_or_compute(cache_key, fn -> compute_for_you_items(opts) end) do
          {:cached, items} -> items
          {:computed, items} -> items
        end
      else
        compute_for_you_items(opts)
      end

    # Always apply user-specific engagement status fresh (not cached)
    paginate_results(base_items, limit, current_user_id)
  end

  # Computes the raw feed items (cacheable part)
  defp compute_for_you_items(opts) do
    limit = Keyword.get(opts, :limit, 20)
    cursor = Keyword.get(opts, :cursor)
    ai_tool_ids = Keyword.get(opts, :ai_tool_ids, [])
    tech_stack_ids = Keyword.get(opts, :tech_stack_ids, [])

    # Fetch target: we want at least @minimum_feed_items total, but respect the limit for pagination
    fetch_target = max(@minimum_feed_items, limit + 1)

    # Fetch recent items with time decay scoring (7 days)
    primary_cutoff = DateTime.add(DateTime.utc_now(), -@candidate_window_days, :day)
    {recent_posts, recent_projects, recent_gigs} = fetch_scored_items(primary_cutoff, cursor, fetch_target)

    # Apply preference boost to projects and gigs (posts don't have tech associations)
    boosted_projects = apply_preference_boost(recent_projects, ai_tool_ids, tech_stack_ids)
    boosted_gigs = apply_preference_boost_to_gigs(recent_gigs, ai_tool_ids, tech_stack_ids)

    # Apply boosts in a single pass: premium boost + new creator boost
    # Combined to reduce DB queries (2 -> 1) and iterations (2 -> 1)
    recent_items =
      (recent_posts ++ boosted_projects ++ boosted_gigs)
      |> apply_combined_boosts()
      |> Enum.sort_by(& &1.score, :desc)

    # Get IDs of already fetched items to exclude from backfill
    recent_ids = MapSet.new(recent_items, & &1.id)

    # If we have fewer than minimum items, backfill with older items (engagement only, no time decay)
    all_items =
      if length(recent_items) < @minimum_feed_items and cursor == nil do
        needed = @minimum_feed_items - length(recent_items)
        older_items = fetch_older_items_by_engagement(primary_cutoff, recent_ids, needed)
        # Also boost older projects and apply combined boosts
        boosted_older =
          older_items
          |> apply_preference_boost_to_mixed(ai_tool_ids, tech_stack_ids)
          |> apply_combined_boosts()

        recent_items ++ boosted_older
      else
        recent_items
      end

    # Re-sort after backfill to ensure boosted items float up
    sorted_items = Enum.sort_by(all_items, & &1.score, :desc)

    # Take what we need for this page
    items_for_page = Enum.take(sorted_items, limit + 1)

    # Apply diversification to avoid too many posts from same user
    diversified = diversify_feed(items_for_page, limit)

    # Ensure discovery slots for small creators so new accounts can grow
    ensure_discovery_slots(diversified, limit)
  end

  # Preference boost multiplier for matching projects
  @preference_boost 1.5

  # Premium users' content gets a boost in the feed
  @premium_boost 1.3

  # New creator discovery boost - helps new accounts get visibility
  # Accounts younger than this get a score boost (in days)
  @new_creator_threshold_days 30
  # Maximum boost for brand new accounts (decays linearly over threshold period)
  @new_creator_boost_max 1.8
  # Minimum items from "small" creators per feed page (creators with < 100 followers)
  @min_discovery_slots 2
  @small_creator_follower_threshold 100

  # Convert Decimal or other numeric types to float
  defp to_float(%Decimal{} = d), do: Decimal.to_float(d)
  defp to_float(nil), do: 0.0
  defp to_float(n) when is_float(n), do: n
  defp to_float(n) when is_integer(n), do: n * 1.0

  # Applies preference boost to a list of project items
  # Projects matching user's AI tools or tech stacks get a score multiplier
  defp apply_preference_boost(projects, [], []), do: projects

  defp apply_preference_boost(projects, ai_tool_ids, tech_stack_ids) do
    ai_tool_set = MapSet.new(ai_tool_ids)
    tech_stack_set = MapSet.new(tech_stack_ids)

    Enum.map(projects, fn item ->
      project = item.project
      project_ai_ids = Enum.map(project.ai_tools || [], & &1.id) |> MapSet.new()
      project_stack_ids = Enum.map(project.tech_stacks || [], & &1.id) |> MapSet.new()

      has_matching_tool = not MapSet.disjoint?(ai_tool_set, project_ai_ids)
      has_matching_stack = not MapSet.disjoint?(tech_stack_set, project_stack_ids)

      if has_matching_tool or has_matching_stack do
        %{item | score: to_float(item.score) * @preference_boost}
      else
        item
      end
    end)
  end

  # Applies preference boost to a list of gig items
  # Gigs matching user's AI tools or tech stacks get a score multiplier
  defp apply_preference_boost_to_gigs(gigs, [], []), do: gigs

  defp apply_preference_boost_to_gigs(gigs, ai_tool_ids, tech_stack_ids) do
    ai_tool_set = MapSet.new(ai_tool_ids)
    tech_stack_set = MapSet.new(tech_stack_ids)

    Enum.map(gigs, fn item ->
      gig = item.gig
      gig_ai_ids = Enum.map(gig.ai_tools || [], & &1.id) |> MapSet.new()
      gig_stack_ids = Enum.map(gig.tech_stacks || [], & &1.id) |> MapSet.new()

      has_matching_tool = not MapSet.disjoint?(ai_tool_set, gig_ai_ids)
      has_matching_stack = not MapSet.disjoint?(tech_stack_set, gig_stack_ids)

      if has_matching_tool or has_matching_stack do
        %{item | score: to_float(item.score) * @preference_boost}
      else
        item
      end
    end)
  end

  # Applies preference boost to a mixed list of posts and projects
  # Only projects are boosted; posts are left unchanged
  defp apply_preference_boost_to_mixed(items, [], []), do: items

  defp apply_preference_boost_to_mixed(items, ai_tool_ids, tech_stack_ids) do
    ai_tool_set = MapSet.new(ai_tool_ids)
    tech_stack_set = MapSet.new(tech_stack_ids)

    Enum.map(items, fn item ->
      case item.type do
        "project" ->
          project = item.project
          project_ai_ids = Enum.map(project.ai_tools || [], & &1.id) |> MapSet.new()
          project_stack_ids = Enum.map(project.tech_stacks || [], & &1.id) |> MapSet.new()

          has_matching_tool = not MapSet.disjoint?(ai_tool_set, project_ai_ids)
          has_matching_stack = not MapSet.disjoint?(tech_stack_set, project_stack_ids)

          if has_matching_tool or has_matching_stack do
            %{item | score: to_float(item.score) * @preference_boost}
          else
            item
          end

        "gig" ->
          gig = item.gig
          gig_ai_ids = Enum.map(gig.ai_tools || [], & &1.id) |> MapSet.new()
          gig_stack_ids = Enum.map(gig.tech_stacks || [], & &1.id) |> MapSet.new()

          has_matching_tool = not MapSet.disjoint?(ai_tool_set, gig_ai_ids)
          has_matching_stack = not MapSet.disjoint?(tech_stack_set, gig_stack_ids)

          if has_matching_tool or has_matching_stack do
            %{item | score: to_float(item.score) * @preference_boost}
          else
            item
          end

        _ ->
          # Posts don't have tech associations, leave unchanged
          item
      end
    end)
  end


  # Combined boost function: applies premium boost AND new creator boost in a single pass
  # This reduces 2 DB queries to 1 and 2 iterations to 1
  defp apply_combined_boosts(items) when items == [], do: []

  defp apply_combined_boosts(items) do
    user_ids = items |> Enum.map(& &1.user.id) |> Enum.uniq()

    # Single query to get both premium status and account age
    user_data =
      from(u in Backend.Accounts.User,
        where: u.id in ^user_ids,
        select: {u.id, u.subscription_status, u.inserted_at}
      )
      |> Repo.all()
      |> Map.new(fn {id, status, inserted_at} ->
        {id, %{premium: status in ["active", "trialing"], inserted_at: inserted_at}}
      end)

    now = DateTime.utc_now()
    threshold_seconds = @new_creator_threshold_days * 24 * 60 * 60

    # Single iteration applying both boosts
    Enum.map(items, fn item ->
      case Map.get(user_data, item.user.id) do
        nil ->
          item

        %{premium: is_premium, inserted_at: inserted_at} ->
          score = to_float(item.score)

          # Apply premium boost
          score = if is_premium, do: score * @premium_boost, else: score

          # Apply new creator boost
          age_seconds = DateTime.diff(now, inserted_at, :second)

          score =
            if age_seconds < threshold_seconds do
              boost_factor = @new_creator_boost_max - ((@new_creator_boost_max - 1.0) * age_seconds / threshold_seconds)
              score * boost_factor
            else
              score
            end

          %{item | score: score}
      end
    end)
  end

  # Ensures minimum discovery slots for small creators in the feed
  # This guarantees new/small accounts get visibility even among popular content
  defp ensure_discovery_slots(items, limit) do
    user_ids = items |> Enum.map(& &1.user.id) |> Enum.uniq()

    # Batch-load follower counts
    follower_counts =
      from(f in Follow,
        where: f.following_id in ^user_ids,
        group_by: f.following_id,
        select: {f.following_id, count(f.id)}
      )
      |> Repo.all()
      |> Map.new()

    # Separate items into small creators and established creators
    {small_creator_items, established_items} =
      Enum.split_with(items, fn item ->
        follower_count = Map.get(follower_counts, item.user.id, 0)
        follower_count < @small_creator_follower_threshold
      end)

    # Sort both lists by score
    small_creator_items = Enum.sort_by(small_creator_items, & &1.score, :desc)
    established_items = Enum.sort_by(established_items, & &1.score, :desc)

    # Calculate how many discovery slots we need
    discovery_slots_needed = min(@min_discovery_slots, length(small_creator_items))

    # Take top small creator items for discovery slots
    discovery_items = Enum.take(small_creator_items, discovery_slots_needed)
    remaining_small = Enum.drop(small_creator_items, discovery_slots_needed)

    # Merge remaining items and sort by score
    remaining_items =
      (remaining_small ++ established_items)
      |> Enum.sort_by(& &1.score, :desc)
      |> Enum.take(limit - discovery_slots_needed)

    # Interleave discovery items throughout the feed (not all at the end)
    interleave_discovery_items(remaining_items, discovery_items)
  end

  # Interleaves discovery items throughout the feed at regular intervals
  defp interleave_discovery_items(main_items, []), do: main_items
  defp interleave_discovery_items([], discovery_items), do: discovery_items

  defp interleave_discovery_items(main_items, discovery_items) do
    # Place discovery items at roughly even intervals
    main_count = length(main_items)
    discovery_count = length(discovery_items)
    interval = max(1, div(main_count + discovery_count, discovery_count + 1))

    {result, remaining_discovery} =
      main_items
      |> Enum.with_index(1)
      |> Enum.reduce({[], discovery_items}, fn {item, idx}, {acc, disc} ->
        # Insert a discovery item at each interval
        if rem(idx, interval) == 0 and disc != [] do
          [d | rest] = disc
          {[item, d | acc], rest}
        else
          {[item | acc], disc}
        end
      end)

    # Append any remaining discovery items
    (remaining_discovery ++ result)
    |> Enum.reverse()
  end

  # Fetches older items (before cutoff) ranked by pure engagement score (no time decay)
  defp fetch_older_items_by_engagement(cutoff, exclude_ids, needed) do
    posts = fetch_older_posts_by_engagement(cutoff, exclude_ids, needed)
    projects = fetch_older_projects_by_engagement(cutoff, exclude_ids, needed)

    (posts ++ projects)
    |> Enum.sort_by(& &1.score, :desc)
    |> Enum.take(needed)
  end

  # Optimized: batch preloads instead of N+1 individual preloads
  defp fetch_older_posts_by_engagement(cutoff, exclude_ids, needed) do
    query = build_engagement_only_posts_query(cutoff)

    results =
      query
      |> limit(^(needed * 2))
      |> Repo.all()
      |> Enum.reject(fn result -> MapSet.member?(exclude_ids, result.post.id) end)
      |> Enum.take(needed)

    # Batch preload all posts at once
    post_ids = Enum.map(results, fn r -> r.post.id end)
    posts_map =
      if post_ids != [] do
        from(p in Post,
          where: p.id in ^post_ids,
          preload: [
            :user,
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    Enum.map(results, fn result ->
      post = Map.get(posts_map, result.post.id, result.post)
      %{
        id: post.id,
        type: "post",
        post: post,
        user: post.user,
        score: result.score,
        sort_date: post.inserted_at
      }
    end)
  end

  # Optimized: batch preloads instead of N+1 individual preloads
  defp fetch_older_projects_by_engagement(cutoff, exclude_ids, needed) do
    query = build_engagement_only_projects_query(cutoff)

    results =
      query
      |> limit(^(needed * 2))
      |> Repo.all()
      |> Enum.reject(fn result -> MapSet.member?(exclude_ids, result.project.id) end)
      |> Enum.take(needed)

    # Batch preload all projects at once
    project_ids = Enum.map(results, fn r -> r.project.id end)
    projects_map =
      if project_ids != [] do
        from(p in Project,
          where: p.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    Enum.map(results, fn result ->
      project = Map.get(projects_map, result.project.id, result.project)
      %{
        id: project.id,
        type: "project",
        project: project,
        user: project.user,
        score: result.score,
        sort_date: project.published_at || project.inserted_at
      }
    end)
  end

  # Engagement-only scoring for older posts (no time decay)
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  defp build_engagement_only_posts_query(before_cutoff) do
    from(p in Post,
      join: u in assoc(p, :user),
      where: p.inserted_at <= ^before_cutoff,
      select: %{
        post: p,
        user: u,
        score:
          fragment(
            """
              COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
              COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count
          )
      },
      order_by: [
        desc:
          fragment(
            """
              COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
              COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count
          )
      ]
    )
  end

  # Engagement-only scoring for older projects (no time decay)
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  defp build_engagement_only_projects_query(before_cutoff) do
    from(proj in Project,
      join: u in assoc(proj, :user),
      where: proj.status == "published" and proj.published_at <= ^before_cutoff,
      select: %{
        project: proj,
        user: u,
        score:
          fragment(
            """
              COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
              COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count
          )
      },
      order_by: [
        desc:
          fragment(
            """
              COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
              COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count
          )
      ]
    )
  end

  # Fetches scored posts, projects, and gigs with optional time cutoff
  # Optimized: parallel queries + batch preloads instead of N+1 individual preloads
  defp fetch_scored_items(cutoff, cursor, limit) do
    # Build queries
    posts_query = build_scored_posts_query(cutoff)
    projects_query = build_scored_projects_query(cutoff)
    gigs_query = build_scored_gigs_query(cutoff)

    # Run all three queries in parallel for lower latency
    posts_task = Task.async(fn ->
      posts_query
      |> apply_cursor_filter(cursor)
      |> limit(^(limit + 1))
      |> Repo.all()
    end)

    projects_task = Task.async(fn ->
      projects_query
      |> apply_cursor_filter(cursor)
      |> limit(^(limit + 1))
      |> Repo.all()
    end)

    gigs_task = Task.async(fn ->
      gigs_query
      |> apply_cursor_filter(cursor)
      |> limit(^(limit + 1))
      |> Repo.all()
    end)

    # Await all results
    post_results = Task.await(posts_task)
    project_results = Task.await(projects_task)
    gig_results = Task.await(gigs_task)

    # Run batch preloads in parallel too
    posts_preload_task = Task.async(fn ->
      post_ids = Enum.map(post_results, fn r -> r.post.id end)
      if post_ids != [] do
        from(p in Post,
          where: p.id in ^post_ids,
          preload: [
            :user,
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end
    end)

    projects_preload_task = Task.async(fn ->
      project_ids = Enum.map(project_results, fn r -> r.project.id end)
      if project_ids != [] do
        from(p in Project,
          where: p.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end
    end)

    gigs_preload_task = Task.async(fn ->
      gig_ids = Enum.map(gig_results, fn r -> r.gig.id end)
      if gig_ids != [] do
        from(g in Gig,
          where: g.id in ^gig_ids,
          preload: [:user, :ai_tools, :tech_stacks]
        )
        |> Repo.all()
        |> Map.new(fn g -> {g.id, g} end)
      else
        %{}
      end
    end)

    # Await preloads
    posts_map = Task.await(posts_preload_task)
    projects_map = Task.await(projects_preload_task)
    gigs_map = Task.await(gigs_preload_task)

    # Build final results
    posts =
      Enum.map(post_results, fn result ->
        post = Map.get(posts_map, result.post.id, result.post)
        %{
          id: post.id,
          type: "post",
          post: post,
          user: post.user,
          score: result.score,
          sort_date: post.inserted_at
        }
      end)

    projects =
      Enum.map(project_results, fn result ->
        project = Map.get(projects_map, result.project.id, result.project)
        %{
          id: project.id,
          type: "project",
          project: project,
          user: project.user,
          score: result.score,
          sort_date: project.published_at || project.inserted_at
        }
      end)

    gigs =
      Enum.map(gig_results, fn result ->
        gig = Map.get(gigs_map, result.gig.id, result.gig)
        %{
          id: gig.id,
          type: "gig",
          gig: gig,
          user: gig.user,
          score: result.score,
          sort_date: gig.inserted_at
        }
      end)

    {posts, projects, gigs}
  end

  @doc """
  Returns the "Following" chronological feed.

  Shows posts and projects from users the current user follows.

  Options:
  - :limit - Number of items to return (default 20)
  - :cursor - Pagination cursor (timestamp:id format)
  - :current_user_id - Required for following feed
  """
  def following_feed(user_id, opts \\ []) when is_binary(user_id) do
    limit = Keyword.get(opts, :limit, 20)
    cursor = Keyword.get(opts, :cursor)
    current_user_id = Keyword.get(opts, :current_user_id, user_id)

    # Get followed user IDs
    followed_ids = get_followed_user_ids(user_id)

    if followed_ids == [] do
      %{items: [], next_cursor: nil, has_more: false}
    else
      # Get posts from followed users - fetch raw results first
      post_results =
        from(p in Post,
          join: u in assoc(p, :user),
          where: p.user_id in ^followed_ids,
          select: %{
            id: p.id,
            type: "post",
            post: p,
            user: u,
            sort_date: p.inserted_at
          },
          order_by: [desc: p.inserted_at]
        )
        |> apply_following_cursor_filter(cursor)
        |> limit(^(limit + 1))
        |> Repo.all()

      # Batch preload all posts at once (1 query instead of N)
      post_ids = Enum.map(post_results, fn r -> r.post.id end)
      posts_map =
        if post_ids != [] do
          from(p in Post,
            where: p.id in ^post_ids,
            preload: [
              :media,
              quoted_post: [:user, :media],
              quoted_project: [:user, :ai_tools, :tech_stacks, :images]
            ]
          )
          |> Repo.all()
          |> Map.new(fn p -> {p.id, p} end)
        else
          %{}
        end

      posts = Enum.map(post_results, fn result ->
        post = Map.get(posts_map, result.post.id, result.post)
        %{result | post: post}
      end)

      # Get projects from followed users - fetch raw results first
      project_results =
        from(proj in Project,
          join: u in assoc(proj, :user),
          where: proj.user_id in ^followed_ids and proj.status == "published",
          select: %{
            id: proj.id,
            type: "project",
            project: proj,
            user: u,
            sort_date: proj.published_at
          },
          order_by: [desc: proj.published_at]
        )
        |> apply_following_cursor_filter(cursor)
        |> limit(^(limit + 1))
        |> Repo.all()

      # Batch preload all projects at once
      project_ids = Enum.map(project_results, fn r -> r.project.id end)
      projects_map =
        if project_ids != [] do
          from(p in Project,
            where: p.id in ^project_ids,
            preload: [:ai_tools, :tech_stacks, :images]
          )
          |> Repo.all()
          |> Map.new(fn p -> {p.id, p} end)
        else
          %{}
        end

      projects = Enum.map(project_results, fn result ->
        project = Map.get(projects_map, result.project.id, result.project)
        %{result | project: project}
      end)

      # Get reposts from followed users
      reposts = get_following_reposts(followed_ids, cursor, limit)

      # Combine and sort by date
      all_items =
        (posts ++ projects ++ reposts)
        |> Enum.sort_by(& &1.sort_date, {:desc, DateTime})
        |> Enum.take(limit + 1)

      paginate_results(all_items, limit, current_user_id, :following)
    end
  end

  # ============================================================================
  # Private Functions - Query Building
  # ============================================================================

  # No time cutoff - fetch all posts
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  # Added freshness bonus that decays over 4 hours
  defp build_scored_posts_query(nil) do
    from(p in Post,
      join: u in assoc(p, :user),
      select: %{
        post: p,
        user: u,
        score:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count,
            p.inserted_at,
            p.inserted_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count,
            p.inserted_at,
            p.inserted_at
          )
      ]
    )
  end

  # With time cutoff - filter posts within the window
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  # Added freshness bonus that decays over 4 hours
  defp build_scored_posts_query(cutoff) do
    from(p in Post,
      join: u in assoc(p, :user),
      where: p.inserted_at > ^cutoff,
      select: %{
        post: p,
        user: u,
        score:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count,
            p.inserted_at,
            p.inserted_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            p.likes_count,
            p.comments_count,
            p.reposts_count,
            p.bookmarks_count,
            p.quotes_count,
            p.inserted_at,
            p.inserted_at
          )
      ]
    )
  end

  # No time cutoff - fetch all published projects
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  # Added freshness bonus that decays over 4 hours
  defp build_scored_projects_query(nil) do
    from(proj in Project,
      join: u in assoc(proj, :user),
      where: proj.status == "published",
      select: %{
        project: proj,
        user: u,
        score:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count,
            proj.published_at,
            proj.published_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count,
            proj.published_at,
            proj.published_at
          )
      ]
    )
  end

  # With time cutoff - filter projects within the window
  # Updated weights: likes=1.0, comments=10.0, reposts=5.0, bookmarks=4.0, quotes=8.0
  # Added freshness bonus that decays over 4 hours
  defp build_scored_projects_query(cutoff) do
    from(proj in Project,
      join: u in assoc(proj, :user),
      where: proj.status == "published" and proj.published_at > ^cutoff,
      select: %{
        project: proj,
        user: u,
        score:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count,
            proj.published_at,
            proj.published_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (
                COALESCE(?, 0) * 1.0 + COALESCE(?, 0) * 10.0 + COALESCE(?, 0) * 5.0 +
                COALESCE(?, 0) * 4.0 + COALESCE(?, 0) * 8.0 +
                GREATEST(0, 10.0 * (1.0 - EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 / 6.0))
              ) / POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            proj.likes_count,
            proj.comments_count,
            proj.reposts_count,
            proj.bookmarks_count,
            proj.quotes_count,
            proj.published_at,
            proj.published_at
          )
      ]
    )
  end

  # No time cutoff - fetch all open gigs
  # Gig scoring: bids_count * 15.0 + views_count * 0.5, with dampening factor
  defp build_scored_gigs_query(nil) do
    from(g in Gig,
      join: u in assoc(g, :user),
      where: g.status == "open",
      select: %{
        gig: g,
        user: u,
        score:
          fragment(
            """
              (COALESCE(?, 0) * 15.0 + COALESCE(?, 0) * 0.5) *
              ? /
              POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            g.bids_count,
            g.views_count,
            ^@gig_dampening_factor,
            g.inserted_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (COALESCE(?, 0) * 15.0 + COALESCE(?, 0) * 0.5) *
              ? /
              POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            g.bids_count,
            g.views_count,
            ^@gig_dampening_factor,
            g.inserted_at
          )
      ]
    )
  end

  # With time cutoff - filter gigs within the window
  defp build_scored_gigs_query(cutoff) do
    from(g in Gig,
      join: u in assoc(g, :user),
      where: g.status == "open" and g.inserted_at > ^cutoff,
      select: %{
        gig: g,
        user: u,
        score:
          fragment(
            """
              (COALESCE(?, 0) * 15.0 + COALESCE(?, 0) * 0.5) *
              ? /
              POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            g.bids_count,
            g.views_count,
            ^@gig_dampening_factor,
            g.inserted_at
          )
      },
      order_by: [
        desc:
          fragment(
            """
              (COALESCE(?, 0) * 15.0 + COALESCE(?, 0) * 0.5) *
              ? /
              POWER(EXTRACT(EPOCH FROM (NOW() - ?)) / 3600.0 + 2, 1.8)
            """,
            g.bids_count,
            g.views_count,
            ^@gig_dampening_factor,
            g.inserted_at
          )
      ]
    )
  end

  defp get_followed_user_ids(user_id) do
    from(f in Follow,
      where: f.follower_id == ^user_id,
      select: f.following_id
    )
    |> Repo.all()
  end

  defp get_following_reposts(followed_ids, cursor, limit) do
    query =
      from(r in Repost,
        join: ru in assoc(r, :user),
        where: r.user_id in ^followed_ids,
        select: %{
          id: r.id,
          type: "repost",
          repostable_type: r.repostable_type,
          repostable_id: r.repostable_id,
          reposter: ru,
          sort_date: r.inserted_at
        },
        order_by: [desc: r.inserted_at]
      )
      |> apply_following_cursor_filter(cursor)
      |> limit(^(limit + 1))

    reposts = Repo.all(query)

    # Batch load all reposted items to avoid N+1 queries
    batch_load_reposted_items(reposts)
  end

  # Batch loads reposted posts and projects in 2 queries instead of N queries
  defp batch_load_reposted_items(reposts) do
    # Separate reposts by type
    {post_reposts, project_reposts} =
      Enum.split_with(reposts, fn r -> r.repostable_type == "Post" end)

    # Batch load all posts
    post_ids = Enum.map(post_reposts, & &1.repostable_id)
    posts_map =
      if post_ids != [] do
        from(p in Post,
          where: p.id in ^post_ids,
          preload: [
            :user,
            :media,
            quoted_post: [:user, :media],
            quoted_project: [:user, :ai_tools, :tech_stacks, :images]
          ]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    # Batch load all projects
    project_ids = Enum.map(project_reposts, & &1.repostable_id)
    projects_map =
      if project_ids != [] do
        from(proj in Project,
          where: proj.id in ^project_ids,
          preload: [:user, :ai_tools, :tech_stacks, :images]
        )
        |> Repo.all()
        |> Map.new(fn p -> {p.id, p} end)
      else
        %{}
      end

    # Map reposts to their loaded items
    reposts
    |> Enum.map(fn repost ->
      case repost.repostable_type do
        "Post" ->
          case Map.get(posts_map, repost.repostable_id) do
            nil -> nil
            post ->
              %{
                id: repost.id,
                type: "repost",
                post: post,
                user: post.user,
                reposter: repost.reposter,
                sort_date: repost.sort_date
              }
          end

        "Project" ->
          case Map.get(projects_map, repost.repostable_id) do
            nil -> nil
            project ->
              %{
                id: repost.id,
                type: "repost",
                project: project,
                user: project.user,
                reposter: repost.reposter,
                sort_date: repost.sort_date
              }
          end

        _ ->
          nil
      end
    end)
    |> Enum.filter(&(&1 != nil))
  end

  # ============================================================================
  # Private Functions - Cursor Pagination
  # ============================================================================

  defp apply_cursor_filter(query, nil), do: query

  defp apply_cursor_filter(query, cursor) do
    case decode_score_cursor(cursor) do
      {:ok, score, _id} ->
        # Filter by score less than cursor score (for descending order)
        from(q in query, having: fragment("? < ?", fragment("score"), ^score))

      _ ->
        query
    end
  end

  defp apply_following_cursor_filter(query, nil), do: query

  defp apply_following_cursor_filter(query, cursor) do
    case decode_timestamp_cursor(cursor) do
      {:ok, timestamp, _id} ->
        from([p] in query, where: p.inserted_at < ^timestamp)

      _ ->
        query
    end
  end

  @doc """
  Encodes a score-based cursor for "for-you" feed pagination.
  Format: "score:id" base64 encoded
  """
  def encode_score_cursor(score, id) when is_float(score) or is_integer(score) do
    "#{score}:#{id}"
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Decodes a score-based cursor.
  """
  def decode_score_cursor(cursor) when is_binary(cursor) do
    with {:ok, decoded} <- Base.url_decode64(cursor, padding: false),
         [score_str, id] <- String.split(decoded, ":", parts: 2),
         {score, _} <- Float.parse(score_str) do
      {:ok, score, id}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  @doc """
  Encodes a timestamp-based cursor for "following" feed pagination.
  Format: "timestamp:id" base64 encoded
  """
  def encode_timestamp_cursor(%DateTime{} = timestamp, id) do
    "#{DateTime.to_iso8601(timestamp)}:#{id}"
    |> Base.url_encode64(padding: false)
  end

  @doc """
  Decodes a timestamp-based cursor.
  """
  def decode_timestamp_cursor(cursor) when is_binary(cursor) do
    with {:ok, decoded} <- Base.url_decode64(cursor, padding: false),
         [timestamp_str, id] <- String.split(decoded, ":", parts: 2),
         {:ok, timestamp, _} <- DateTime.from_iso8601(timestamp_str) do
      {:ok, timestamp, id}
    else
      _ -> {:error, :invalid_cursor}
    end
  end

  # ============================================================================
  # Private Functions - Result Processing
  # ============================================================================

  defp diversify_feed(items, limit) do
    # Limit to max 3 consecutive posts from the same user
    {diversified, _} =
      Enum.reduce(items, {[], %{}}, fn item, {acc, user_counts} ->
        user_id = item.user.id
        count = Map.get(user_counts, user_id, 0)

        if count < 3 and length(acc) < limit do
          {acc ++ [item], Map.put(user_counts, user_id, count + 1)}
        else
          {acc, user_counts}
        end
      end)

    diversified
  end

  defp paginate_results(items, limit, current_user_id, feed_type \\ :for_you) do
    has_more = length(items) > limit
    items = Enum.take(items, limit)

    # Add engagement counts
    items_with_counts = add_engagement_counts(items)

    # Add engagement status if user is authenticated
    items_with_status =
      if current_user_id do
        add_engagement_status(items_with_counts, current_user_id)
      else
        items_with_counts
      end

    # Generate next cursor
    next_cursor =
      if has_more and length(items) > 0 do
        last = List.last(items)

        case feed_type do
          :following -> encode_timestamp_cursor(last.sort_date, last.id)
          :for_you -> encode_score_cursor(last.score || 0.0, last.id)
        end
      else
        nil
      end

    %{
      items: items_with_status,
      next_cursor: next_cursor,
      has_more: has_more
    }
  end

  defp add_engagement_counts(items) do
    Enum.map(items, fn item ->
      {item_type, item_id} = get_item_type_and_id(item)

      likes_count = get_count_from_item(item, :likes_count)
      comments_count = get_count_from_item(item, :comments_count)
      reposts_count = Backend.Social.get_reposts_count(item_type, item_id)

      item
      |> Map.put(:likes_count, likes_count)
      |> Map.put(:comments_count, comments_count)
      |> Map.put(:reposts_count, reposts_count)
    end)
  end

  defp get_count_from_item(item, field) do
    cond do
      Map.has_key?(item, :post) and item.post != nil ->
        Map.get(item.post, field, 0)

      Map.has_key?(item, :project) and item.project != nil ->
        Map.get(item.project, field, 0)

      Map.has_key?(item, :gig) and item.gig != nil ->
        # Gigs don't have likes/comments/reposts, return 0 for these standard fields
        0

      true ->
        0
    end
  end

  defp add_engagement_status(items, user_id) do
    # Collect all item type/id pairs for batch lookup (3 queries instead of 3*N)
    item_keys =
      Enum.map(items, fn item ->
        get_item_type_and_id(item)
      end)

    # Batch fetch all engagement statuses
    liked_set = Backend.Social.batch_liked_items(user_id, item_keys)
    bookmarked_set = Backend.Social.batch_bookmarked_items(user_id, item_keys)
    reposted_set = Backend.Social.batch_reposted_items(user_id, item_keys)

    # Apply engagement status to each item using the pre-fetched sets
    Enum.map(items, fn item ->
      {item_type, item_id} = get_item_type_and_id(item)
      key = {item_type, item_id}

      item
      |> Map.put(:liked, MapSet.member?(liked_set, key))
      |> Map.put(:bookmarked, MapSet.member?(bookmarked_set, key))
      |> Map.put(:reposted, MapSet.member?(reposted_set, key))
    end)
  end

  defp get_item_type_and_id(item) do
    case item.type do
      "post" ->
        {"Post", item.post.id}

      "project" ->
        {"Project", item.project.id}

      "gig" ->
        {"Gig", item.gig.id}

      "repost" ->
        if Map.has_key?(item, :post) and item.post != nil do
          {"Post", item.post.id}
        else
          {"Project", item.project.id}
        end
    end
  end

  # ============================================================================
  # Public API - Engagement Weights (for testing/tuning)
  # ============================================================================

  @doc """
  Returns the current engagement weights used for scoring.
  """
  def engagement_weights, do: @engagement_weights

  @doc """
  Returns the current time decay gravity.
  """
  def time_decay_gravity, do: @time_decay_gravity

  @doc """
  Calculates the trending score for a given item.
  Useful for debugging and testing.
  """
  def calculate_score(item) do
    {likes, comments, reposts, bookmarks, quotes, inserted_at} =
      case item do
        %Post{} = post ->
          {post.likes_count || 0, post.comments_count || 0, post.reposts_count || 0,
           post.bookmarks_count || 0, post.quotes_count || 0, post.inserted_at}

        %Project{} = project ->
          {project.likes_count || 0, project.comments_count || 0, project.reposts_count || 0,
           project.bookmarks_count || 0, project.quotes_count || 0,
           project.published_at || project.inserted_at}

        _ ->
          {0, 0, 0, 0, 0, DateTime.utc_now()}
      end

    weighted_engagement =
      likes * @engagement_weights.likes +
        comments * @engagement_weights.comments +
        reposts * @engagement_weights.reposts +
        bookmarks * @engagement_weights.bookmarks +
        quotes * @engagement_weights.quotes

    age_hours = DateTime.diff(DateTime.utc_now(), inserted_at, :hour)

    # Add freshness bonus for new content (decays over 4 hours)
    freshness_bonus = max(0.0, @freshness_bonus_base * (1.0 - age_hours / @freshness_bonus_hours))

    (weighted_engagement + freshness_bonus) / :math.pow(age_hours + 2, @time_decay_gravity)
  end

  @doc """
  Returns the freshness bonus parameters.
  """
  def freshness_bonus_config do
    %{
      bonus_hours: @freshness_bonus_hours,
      bonus_base: @freshness_bonus_base
    }
  end

  @doc """
  Returns the self-engagement discount factor.
  """
  def self_engagement_discount, do: @self_engagement_discount

  @doc """
  Returns the new creator discovery settings.
  These help new accounts get visibility in the feed.
  """
  def new_creator_discovery_config do
    %{
      # Accounts younger than this (days) get a score boost
      threshold_days: @new_creator_threshold_days,
      # Maximum boost for brand new accounts (1.8x = 80% boost)
      max_boost: @new_creator_boost_max,
      # Minimum items from small creators per page
      min_discovery_slots: @min_discovery_slots,
      # Creators with fewer followers than this are considered "small"
      small_creator_threshold: @small_creator_follower_threshold
    }
  end
end
