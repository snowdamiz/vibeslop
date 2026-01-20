# Feed Algorithm Implementation

**Implementation Date**: January 20, 2026  
**Status**: Completed  
**Last Updated**: January 20, 2026

---

## Overview

This document describes the implementation of Vibeslop's sophisticated feed algorithm, which provides two distinct feed experiences:

1. **For You Feed**: Algorithmic ranking using Twitter/X-style engagement weights combined with time decay
2. **Following Feed**: Chronological feed showing content from followed users

Both feeds support cursor-based pagination for efficient infinite scroll.

---

## Background / Context

The previous feed implementation was purely chronological and the "following" feed was not functional (stubbed with TODO comments). Users needed:

- An algorithmic "For You" feed that surfaces engaging content
- A working "Following" feed showing content from people they follow
- Efficient pagination for smooth infinite scroll

This implementation follows the Phase 1 (MVP) approach outlined in `docs/future/Feed_And_Recommendations_Database_Architecture.md`, using PostgreSQL only without Redis caching.

---

## Implementation Details

### New Module: `Backend.Feed`

Location: `backend/lib/backend/feed.ex`

This module centralizes all feed logic with the following key functions:

```elixir
# Algorithmic "For You" feed
Backend.Feed.for_you_feed(opts)

# Chronological "Following" feed  
Backend.Feed.following_feed(user_id, opts)
```

### Scoring Formula

The "For You" feed uses a scoring formula based on Twitter/X's 2025 engagement weights combined with Hacker News-style time decay:

```
score = weighted_engagement / (age_hours + 2)^gravity
```

Where:
- `weighted_engagement = likes×1.0 + comments×13.5 + reposts×20.0 + bookmarks×10.0 + quotes×15.0`
- `age_hours = hours since the content was posted`
- `gravity = 1.5` (controls decay speed; higher = faster decay)

#### Engagement Weights Rationale

| Action | Weight | Reasoning |
|--------|--------|-----------|
| Reposts | 20.0 | Highest signal - user actively shares to their followers |
| Quotes | 15.0 | High signal - user adds their own commentary |
| Comments | 13.5 | Strong engagement - user takes time to respond |
| Bookmarks | 10.0 | Saves indicate value/reference intent |
| Likes | 1.0 | Baseline - low-effort engagement |

These weights are based on Twitter/X's publicly documented algorithm (2025) which found that sharing actions (retweets, quotes) are much stronger indicators of content quality than passive actions (likes).

### SQL Implementation

The scoring is calculated directly in PostgreSQL for efficiency:

```sql
(COALESCE(likes_count, 0) * 1.0 + 
 COALESCE(comments_count, 0) * 13.5 + 
 COALESCE(reposts_count, 0) * 20.0 +
 COALESCE(bookmarks_count, 0) * 10.0 + 
 COALESCE(quotes_count, 0) * 15.0) /
POWER(EXTRACT(EPOCH FROM (NOW() - inserted_at)) / 3600.0 + 2, 1.5)
```

### Feed Diversification

To prevent feed monotony, the algorithm limits consecutive posts from the same user to a maximum of 3. This ensures variety even when one user's content is scoring highly.

### Cursor-Based Pagination

Replaced offset-based pagination with cursor-based for better performance:

**For You Feed** (score-based cursor):
```elixir
# Cursor format: "score:id" base64 encoded
Backend.Feed.encode_score_cursor(score, id)
Backend.Feed.decode_score_cursor(cursor)
```

**Following Feed** (timestamp-based cursor):
```elixir
# Cursor format: "timestamp:id" base64 encoded
Backend.Feed.encode_timestamp_cursor(timestamp, id)
Backend.Feed.decode_timestamp_cursor(cursor)
```

Benefits:
- No skipped or duplicate items when new content is added
- Consistent performance regardless of offset depth
- Works correctly with real-time content updates

---

## API Changes

### GET `/api/posts`

Updated parameters:
- `feed` - `"for-you"` (default) or `"following"`
- `cursor` - Pagination cursor (replaces `offset` for feed requests)
- `limit` - Number of items (default: 20)

Updated response:
```json
{
  "data": [...],
  "next_cursor": "base64_encoded_cursor_or_null",
  "has_more": true
}
```

### Backend Controller Changes

`BackendWeb.PostController.index/2` now routes to the Feed module:
- `feed=for-you` → `Backend.Feed.for_you_feed/1`
- `feed=following` → `Backend.Feed.following_feed/2`

---

## Database Changes

### New Migration: Feed Optimization Indexes

Location: `backend/priv/repo/migrations/20260120000012_add_feed_optimization_indexes.exs`

```elixir
# Composite index for following feed
create index(:posts, [:user_id, :inserted_at])
create index(:projects, [:user_id, :published_at])

# Composite index for engagement-based sorting
create index(:posts, [:likes_count, :comments_count, :reposts_count, :bookmarks_count])
create index(:projects, [:likes_count, :comments_count, :reposts_count, :bookmarks_count])

# Index for follows lookup
create index(:follows, [:follower_id, :following_id])

# Index for reposts by user
create index(:reposts, [:user_id, :inserted_at])
```

---

## Frontend Changes

### API Client (`frontend/src/lib/api.ts`)

Added `cursor` parameter to `getPosts()`:

```typescript
async getPosts(params?: {
  feed?: string
  limit?: number
  cursor?: string  // New: pagination cursor
  // ... other params
}): Promise<{ 
  data: unknown[]
  next_cursor?: string  // New
  has_more?: boolean    // New
}>
```

### Feed Component (`frontend/src/components/feed/Feed.tsx`)

- Added state for `nextCursor` and `hasMore`
- Updated fetch logic to use cursor pagination
- "Load more" button now uses cursor for seamless pagination
- Added loading state for "load more" action

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Scoring in SQL** | Hardcoded weights in SQL fragment | Avoids PostgreSQL type casting issues with float parameters |
| **No Redis caching** | PostgreSQL only | Phase 1 MVP - simpler ops, sufficient for <1M users |
| **7-day candidate window** | Recent posts only for "For You" | Balances freshness with engagement opportunity |
| **Diversification limit** | Max 3 consecutive posts from same user | Prevents feed monopolization |
| **Cursor encoding** | Base64 of "value:id" | URL-safe, contains tiebreaker for consistent ordering |

---

## Testing / Verification

### Manual Testing

1. **For You Feed**:
   - Load the home page, verify posts are sorted by engagement + recency
   - High-engagement recent posts should appear first
   - Older high-engagement posts should decay appropriately

2. **Following Feed**:
   - Switch to "Following" tab
   - Verify only posts/projects from followed users appear
   - Verify chronological ordering (newest first)

3. **Pagination**:
   - Scroll to bottom and click "Load more"
   - Verify new content loads without duplicates
   - Verify cursor updates correctly

### Score Calculation Test

Use `Backend.Feed.calculate_score/1` to verify scoring:

```elixir
iex> post = Repo.get!(Post, "some-id")
iex> Backend.Feed.calculate_score(post)
# Returns calculated score for debugging
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Feed load time (p95) | < 300ms |
| Pagination load time | < 200ms |
| Concurrent users supported | 10K+ |

---

## Future Considerations

### Phase 2 Enhancements (When Needed)

1. **Redis Caching**: Cache computed feeds with 5-minute TTL
2. **Trending Score Column**: Pre-compute and store scores, update via background job
3. **Personalization**: Factor in user's past engagement patterns
4. **Negative signals**: De-rank content from users the viewer has muted/blocked

### Tuning Opportunities

- Engagement weights can be adjusted based on observed user behavior
- Time decay gravity can be tuned (1.5 is a starting point)
- Candidate window (7 days) can be expanded for slower-moving communities

---

## References

- [Feed Architecture Plan](../future/Feed_And_Recommendations_Database_Architecture.md) - Phased scaling approach
- [Twitter's Recommendation Algorithm](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm) - Engagement weight inspiration
- [Hacker News Ranking Algorithm](https://medium.com/hacking-and-gonzo/how-hacker-news-ranking-algorithm-works-1d9b0cf2c08d) - Time decay formula inspiration

---

## Files Changed

| File | Change |
|------|--------|
| `backend/lib/backend/feed.ex` | New module with feed logic |
| `backend/priv/repo/migrations/20260120000012_add_feed_optimization_indexes.exs` | New migration |
| `backend/lib/backend_web/controllers/post_controller.ex` | Route to Feed module |
| `backend/lib/backend_web/controllers/post_json.ex` | Add cursor pagination response |
| `frontend/src/lib/api.ts` | Add cursor parameter |
| `frontend/src/components/feed/Feed.tsx` | Implement cursor pagination |
