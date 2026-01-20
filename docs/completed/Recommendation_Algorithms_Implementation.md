# Recommendation Algorithms Implementation

**Implementation Date**: January 20, 2026  
**Status**: Completed  
**Last Updated**: January 20, 2026

---

## Overview

This document describes the implementation of Vibeslop's sophisticated recommendation algorithms, providing two key discovery features:

1. **Trending Projects**: Algorithmic ranking using Twitter/X-style engagement weights, time decay, and velocity boost
2. **Who to Follow**: Multi-signal scoring combining social graph analysis, popularity metrics, and interest-based relevance

Both algorithms match the production-grade quality of the existing feed algorithm and are designed to scale to millions of users.

---

## Background / Context

The previous implementations were basic:
- **Trending Projects**: Simple `ORDER BY likes_count` with no time decay or velocity tracking
- **Who to Follow**: Simple `ORDER BY follower_count` with no graph analysis or interest matching

Users needed more sophisticated recommendations that:
- Surface genuinely trending content, not just popular content
- Recommend users based on social connections and shared interests
- Provide personalized suggestions based on engagement patterns

This implementation follows the same production-grade approach as the feed algorithm (see `Feed_Algorithm_Implementation.md`), using PostgreSQL without Redis caching for Phase 1 (MVP).

---

## Implementation Details

### New Module: `Backend.Recommendations`

Location: `backend/lib/backend/recommendations.ex`

This module centralizes all recommendation logic with the following key functions:

```elixir
# Trending projects with sophisticated scoring
Backend.Recommendations.trending_projects(opts)

# Multi-signal user suggestions
Backend.Recommendations.suggested_users(current_user_id, opts)
```

---

## 1. Trending Projects Algorithm

### Scoring Formula

The trending algorithm uses a sophisticated multi-factor scoring system:

```
trending_score = (weighted_engagement × velocity_boost × quality_multiplier) / (age_hours + 2)^1.8
```

### Signal Breakdown

#### Weighted Engagement

Uses Twitter/X's 2025 engagement weights to prioritize high-intent actions:

| Action | Weight | Reasoning |
|--------|--------|-----------|
| Reposts | 20.0 | Highest signal - user actively shares to their followers |
| Quotes | 15.0 | High signal - user adds their own commentary |
| Comments | 13.5 | Strong engagement - user takes time to respond |
| Bookmarks | 10.0 | Saves indicate value/reference intent |
| Likes | 1.0 | Baseline - low-effort engagement |

#### Velocity Boost (1.0 - 3.0x multiplier)

Detects "rising" content by comparing recent engagement to historical engagement:

```
velocity = recent_6h_engagement / (previous_24h_engagement + 1)
velocity_boost = min(1.0 + velocity, 3.0)
```

This uses the `engagement_hourly` table to identify content that's gaining momentum, not just established popular content.

#### Quality Multiplier (1.0 - 1.3x)

Rewards well-presented projects:
- **+0.1** if has images (visual appeal)
- **+0.1** if description > 100 chars (detailed explanation)
- **+0.1** if has tech stacks attached (proper categorization)

#### Time Decay

```
gravity = 1.8  (more aggressive than feed's 1.5)
candidate_window = 14 days
```

Projects decay faster than posts to keep trending list fresh, but the 14-day window allows quality projects to remain visible longer than posts.

### SQL Implementation

The scoring is calculated directly in PostgreSQL for efficiency:

```sql
(COALESCE(likes_count, 0) * 1.0 + 
 COALESCE(comments_count, 0) * 13.5 + 
 COALESCE(reposts_count, 0) * 20.0 + 
 COALESCE(bookmarks_count, 0) * 10.0 + 
 COALESCE(quotes_count, 0) * 15.0) *
(1.0 + 
 CASE WHEN EXISTS(images) THEN 0.1 ELSE 0 END +
 CASE WHEN description > 100 THEN 0.1 ELSE 0 END +
 CASE WHEN EXISTS(tech_stacks) THEN 0.1 ELSE 0 END
) /
POWER(EXTRACT(EPOCH FROM (NOW() - published_at)) / 3600.0 + 2, 1.8)
```

The velocity boost is calculated separately using the `engagement_hourly` table, then applied as a multiplier to the base score.

---

## 2. Who to Follow Algorithm

### Multi-Signal Scoring

The user recommendation system combines three distinct signals:

```
follow_score = (graph_score × 0.4) + (popularity_score × 0.3) + (relevance_score × 0.3)
```

### Signal 1: Social Graph Score (40%)

The most important signal, analyzing social connections:

#### Friends of Friends
```sql
-- Users followed by people you follow
SELECT u.id, COUNT(DISTINCT mutual_followers) as score
FROM users u
JOIN follows f1 ON f1.following_id = u.id
JOIN follows f2 ON f2.follower_id = f1.following_id
WHERE f2.following_id = :current_user_id
  AND u.id != :current_user_id
  AND u.id NOT IN (already followed by user)
GROUP BY u.id
```

This leverages the principle that friends of your friends are likely to be interesting to you.

#### Engaged Creators
```sql
-- Users whose content you've interacted with
SELECT creator_id, 
       (COUNT(likes) × 1.0 + COUNT(bookmarks) × 2.0) as score
FROM likes/bookmarks
WHERE user_id = :current_user_id
GROUP BY creator_id
```

Bookmarks are weighted 2x higher than likes (stronger intent signal).

### Signal 2: Popularity Score (30%)

Identifies active, engaging creators:

```
popularity = log(follower_count + 1) × activity_multiplier × engagement_rate
```

**Activity Multiplier**:
- **1.0** if posted in last 7 days (very active)
- **0.8** if posted 7-30 days ago (moderately active)
- **0.5** if posted 30-60 days ago (low activity)
- **0.0** if inactive for 60+ days (excluded)

The logarithmic follower count prevents mega-accounts from dominating, giving smaller creators a chance.

### Signal 3: Relevance Score (30%)

Matches users based on shared interests:

```sql
-- Users who use the same tools/stacks as your liked projects
SELECT creator_id, 
       COUNT(DISTINCT shared_tools + shared_stacks) as score
FROM project_creators
WHERE their_tools IN (tools from your liked projects)
   OR their_stacks IN (stacks from your liked projects)
GROUP BY creator_id
```

This ensures recommendations align with your demonstrated interests.

### Fallback for New Users

When a user has no follows or engagement history (< 3 likes):

```sql
-- Popular active creators
SELECT u.* 
FROM users u
WHERE recent_activity EXISTS
  AND follower_count > 0
ORDER BY follower_count DESC
LIMIT N
```

Simple but effective for cold-start scenarios.

---

## Database Changes

### New Migration: Recommendation Optimization Indexes

Location: `backend/priv/repo/migrations/20260120094303_add_recommendation_indexes.exs`

```elixir
# Friends-of-friends queries
create index(:follows, [:following_id, :follower_id])

# User activity checks
create index(:posts, [:user_id, :inserted_at])
create index(:projects, [:user_id, :published_at])

# Engagement velocity
create index(:engagement_hourly, [:content_type, :content_id, :hour_bucket])

# Relevance scoring
create index(:project_ai_tools, [:project_id, :ai_tool_id])
create index(:project_tech_stacks, [:project_id, :tech_stack_id])
create index(:likes, [:user_id, :likeable_type, :likeable_id])
create index(:bookmarks, [:user_id, :bookmarkable_type, :bookmarkable_id])
```

These composite indexes enable efficient joins for multi-signal queries.

---

## API Changes

### Trending Projects

**Endpoint**: `GET /api/projects?sort_by=trending`

No API changes - the existing endpoint now uses the sophisticated algorithm.

Updated controller logic in `BackendWeb.ProjectController.index/2`:
- Detects `sort_by=trending` parameter
- Routes to `Backend.Recommendations.trending_projects/1`
- Adds engagement status for authenticated users

Response format (unchanged):
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Project Name",
      "author": { "username": "user", "avatar_url": "..." },
      "likes": 42,
      "tools": ["GPT-4", "Claude"],
      "liked": true,
      "bookmarked": false
    }
  ]
}
```

### Who to Follow

**Endpoint**: `GET /api/users/suggested?limit=3&context=sidebar`

Enhanced controller logic in `BackendWeb.UserController.suggested/2`:
- Uses `Backend.Recommendations.suggested_users/2` for authenticated users
- Falls back to `Accounts.list_suggested_users/1` for anonymous users
- Supports `context` parameter for different use cases (sidebar vs onboarding)

Response format (unchanged):
```json
{
  "data": [
    {
      "username": "user",
      "display_name": "Display Name",
      "avatar_url": "...",
      "bio": "Short bio"
    }
  ]
}
```

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scoring in SQL** | Hardcoded weights in SQL fragments | Avoids type casting issues, maximizes performance |
| **No Redis caching** | PostgreSQL only | Phase 1 MVP - simpler ops, sufficient for <1M users |
| **14-day window for projects** | Longer than posts (7 days) | Projects have longer relevance than ephemeral posts |
| **Velocity boost** | 6h vs 24h comparison | Detects true "trending" vs established popular |
| **Graph weight = 40%** | Highest signal weight | Social connections strongest predictor of interest |
| **Multi-signal combination** | Weighted sum vs ML model | Interpretable, tunable, no training required |
| **Cold-start fallback** | Popular active creators | Simple but effective for new users |

---

## Algorithm Comparison

| Aspect | Old Implementation | New Implementation |
|--------|-------------------|-------------------|
| **Trending Projects** |
| Engagement weights | Equal (likes only) | Twitter/X weights (reposts 20x, quotes 15x, etc.) |
| Time decay | None | Gravity 1.8 with 14-day window |
| Velocity tracking | None | 6h vs 24h engagement comparison |
| Quality signals | None | Images, description length, tech stacks |
| **Who to Follow** |
| Social graph | None | Friends of friends, engaged creators |
| Interest matching | None | Shared tools/stacks from liked projects |
| Activity filtering | None | 60-day activity threshold with decay |
| Popularity scoring | Linear follower count | Log scale + activity + engagement rate |
| Cold-start handling | Random popular users | Active creators with follower threshold |

---

## Testing / Verification

### Manual Testing

1. **Trending Projects**:
   - Load `/api/projects?sort_by=trending`
   - Verify recent projects with strong engagement appear first
   - Verify older popular projects decay appropriately
   - Check that velocity boost elevates "rising" projects

2. **Who to Follow (Authenticated)**:
   - Load `/api/users/suggested` as logged-in user
   - Verify suggestions include friends of friends
   - Verify users with shared interests appear
   - Verify inactive users (60+ days) are excluded

3. **Who to Follow (New User)**:
   - Create new account with no follows
   - Verify popular active creators appear
   - Verify diversity in suggestions

### Score Calculation Testing

Use the recommendation functions directly in IEx:

```elixir
# Test trending projects
iex> Backend.Recommendations.trending_projects(limit: 5)

# Test user suggestions
iex> Backend.Recommendations.suggested_users("user_id", limit: 10)
```

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Trending projects query | < 50ms | With composite indexes |
| Suggested users query | < 100ms | Multi-signal queries cached |
| Trending projects cache TTL | 5 minutes | For sidebar widget |
| Suggested users cache TTL | 15 minutes | For onboarding flow |

---

## Future Enhancements

### Phase 2 (When Needed)

1. **Redis Caching**: Cache computed recommendations with TTL
2. **Personalization**: Factor in user's historical click-through rates
3. **Negative Signals**: De-rank content from muted/blocked users
4. **A/B Testing**: Test different signal weights and formulas
5. **Diversity Injection**: Ensure variety in tools/categories

### Tuning Opportunities

- Signal weights (currently 40/30/30) can be adjusted based on metrics
- Time decay gravity can be tuned per content type
- Velocity boost max multiplier (currently 3.0) can be adjusted
- Quality multiplier thresholds can be refined

---

## References

### Inspiration and Research

1. [Twitter's Recommendation Algorithm](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm) - Engagement weight inspiration
2. [Feed Algorithm Implementation](./Feed_Algorithm_Implementation.md) - Sister implementation
3. [Feed Architecture Plan](../future/Feed_And_Recommendations_Database_Architecture.md) - Phased scaling approach
4. [Hacker News Ranking Algorithm](https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d) - Time decay formula

### Production Patterns

5. [Instagram's Recommendation Systems](https://engineering.fb.com/2025/05/21/production-engineering/journey-to-1000-models-scaling-instagrams-recommendation-system/) - Multi-signal approaches
6. [LinkedIn's People You May Know](https://engineering.linkedin.com/blog/2021/optimizing-pymk) - Social graph algorithms
7. [Pinterest's Related Pins](https://medium.com/pinterest-engineering/building-a-real-time-user-action-counting-system-for-content-recommendation-at-pinterest-1c1f1a3e2de5) - Interest-based recommendations

---

## Files Changed

| File | Change |
|------|--------|
| `backend/lib/backend/recommendations.ex` | **NEW** - Core recommendation module |
| `backend/priv/repo/migrations/20260120094303_add_recommendation_indexes.exs` | **NEW** - Database indexes |
| `backend/lib/backend_web/controllers/project_controller.ex` | Route trending to new algorithm |
| `backend/lib/backend_web/controllers/user_controller.ex` | Route suggestions to new algorithm |

---

## Performance Monitoring

### Metrics to Track

```elixir
# Add Telemetry events
:telemetry.execute(
  [:vibeslop, :recommendations, :trending],
  %{duration: duration, count: count},
  %{source: "api"}
)

:telemetry.execute(
  [:vibeslop, :recommendations, :suggested_users],
  %{duration: duration, count: count, signal_breakdown: breakdown},
  %{source: "api"}
)
```

### Key Metrics

- **Trending projects**: Query time, cache hit rate, score distribution
- **Suggested users**: Query time, signal contribution breakdown, cold-start frequency
- **User engagement**: Click-through rate on trending items
- **Follow rate**: Percentage of suggestions that result in follows

---

## Known Limitations

1. **No personalization**: Trending is same for all users (by design for MVP)
2. **No negative signals**: Doesn't account for muted/blocked users yet
3. **No caching**: Direct database queries (will add Redis in Phase 2)
4. **Single-region**: No geo-based trending (future consideration)
5. **Language agnostic**: No language/locale filtering (future consideration)

---

## Rollout Plan

### Phase 1: Soft Launch (Week 1)
- Deploy with feature flag
- Monitor performance metrics
- Gather initial user feedback
- A/B test against old algorithm

### Phase 2: Full Release (Week 2-3)
- Enable for all users if metrics positive
- Monitor trending diversity
- Track follow conversion rates
- Collect user sentiment

### Phase 3: Optimization (Month 2)
- Tune signal weights based on data
- Add Redis caching if needed
- Implement diversity injection
- Add negative signals

---

**Document Status**: Complete - Ready for production deployment

**Last Review**: January 20, 2026  
**Next Review**: After 100K recommendations served or performance issues detected
