# Feed and Recommendations Database Architecture

**Research Date**: January 20, 2026  
**Status**: Future Implementation Guide  
**Last Updated**: January 20, 2026

---

## Overview

This document outlines the database and infrastructure requirements for building a production-grade feed and recommendations system for Vibeslop. It provides a phased approach to scaling from MVP to enterprise scale, with specific guidance on when to introduce additional technologies like Elasticsearch, vector databases, and caching layers.

**Key Takeaway**: Elasticsearch is not needed at the current stage. PostgreSQL + Redis is the recommended stack for Phase 1 (MVP → 1M users).

---

## Background / Context

Vibeslop is a social media platform for vibe coders to showcase projects, follow creators, and discover content. The platform requires:

1. **Feed Generation**: Personalized "For You" and chronological "Following" feeds
2. **Trending Algorithm**: Surface popular content based on engagement and recency
3. **Search**: Discover users, projects, and content by keywords and tags
4. **Recommendations**: "Similar projects" and "More from this creator" suggestions
5. **Real-time Updates**: Live notifications and engagement counters

The challenge: balance performance, scalability, and operational complexity as the platform grows.

---

## Research Findings Summary

### Production Feed Architecture Patterns

Modern feed systems (Twitter, Instagram, Facebook) use a **three-stage funnel approach**:

| Stage | Purpose | Typical Scale |
|-------|---------|---------------|
| **Sourcing/Retrieval** | Narrow billions → thousands of candidates | Vector search, graph queries |
| **Early-Stage Ranking (ESR)** | Score candidates with lightweight model | Simple engagement metrics |
| **Late-Stage Ranking (LSR)** | Final scoring with ML model | Complex multi-signal models |

**Twitter/X's Engagement Weights** (2025):
- Retweets: 20x multiplier
- Quote Tweets: 15x multiplier
- Replies: 13.5x multiplier
- Bookmarks: 10x multiplier
- Likes: 1x (baseline)

### Instagram's Scale on PostgreSQL

Instagram famously runs on PostgreSQL at massive scale (billions of users) through:
- Aggressive caching with Redis
- Functional partitioning (separate clusters per service)
- Primary key-based access patterns
- Connection pooling and read replicas

**Lesson**: The right PostgreSQL architecture can scale further than most projects will ever need.

---

## Phased Implementation Plan

### Phase 1: MVP → 1M Users (Current Stage)

**Timeline**: Months 1-12  
**Expected Scale**: 50K-1M users, 200K-2M posts, 5K-50K daily active users

#### Recommended Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Primary Database** | PostgreSQL | Users, posts, projects, relationships |
| **Caching Layer** | Redis | Feed caching, real-time counters, sessions |
| **Search** | PostgreSQL Full-Text Search | Basic search with GIN indexes |
| **Real-time** | Phoenix Channels | Live updates, notifications |
| **File Storage** | S3-compatible (R2/S3) | Images, media assets |

#### Why This Stack?

1. **PostgreSQL is sufficient**: Your current schema with `engagement_hourly` and denormalized counters already reflects production best practices
2. **Operational simplicity**: Single database reduces complexity, sync issues, and DevOps overhead
3. **Elixir integration**: Ecto provides excellent PostgreSQL support
4. **Cost-effective**: No additional infrastructure costs

#### Implementation Tasks

**A. Add Redis Caching Layer**

Install dependencies:
```elixir
# mix.exs
{:redix, "~> 1.3"},
{:castore, ">= 0.0.0"}
```

Cache strategy:
```elixir
# lib/vibeslop/cache/feed_cache.ex
defmodule Vibeslop.Cache.FeedCache do
  @ttl 300  # 5 minutes
  
  def get_or_compute_feed(user_id, feed_type) do
    cache_key = "feed:#{user_id}:#{feed_type}"
    
    case Redix.command(:redix, ["GET", cache_key]) do
      {:ok, nil} ->
        feed = compute_feed(user_id, feed_type)
        cache_feed(cache_key, feed)
        feed
      
      {:ok, cached_json} ->
        Jason.decode!(cached_json)
    end
  end
  
  defp cache_feed(key, feed) do
    json = Jason.encode!(feed)
    Redix.command(:redix, ["SETEX", key, @ttl, json])
  end
end
```

**B. Implement Basic Trending Algorithm**

```elixir
# lib/vibeslop/content/trending.ex
defmodule Vibeslop.Content.Trending do
  import Ecto.Query
  
  def trending_score(post) do
    age_hours = DateTime.diff(DateTime.utc_now(), post.inserted_at, :hour)
    
    engagement = 
      post.likes_count * 1.0 +
      post.comments_count * 13.5 +
      post.reposts_count * 20.0 +
      post.bookmarks_count * 10.0
    
    # Time decay formula
    engagement / :math.pow(age_hours + 2, 1.5)
  end
  
  def trending_posts(limit \\ 50) do
    # Only consider recent posts (last 7 days)
    cutoff = DateTime.add(DateTime.utc_now(), -7, :day)
    
    from(p in Post,
      where: p.inserted_at > ^cutoff,
      order_by: [desc: p.likes_count + p.comments_count * 13 + p.reposts_count * 20],
      limit: ^limit
    )
    |> Repo.all()
    |> Enum.map(fn post -> 
      Map.put(post, :trending_score, trending_score(post))
    end)
    |> Enum.sort_by(& &1.trending_score, :desc)
  end
end
```

**C. Add Full-Text Search Indexes**

Migration:
```elixir
defmodule Backend.Repo.Migrations.AddFullTextSearch do
  use Ecto.Migration
  
  def up do
    # Add search vector column to posts
    alter table(:posts) do
      add :search_vector, :tsvector
    end
    
    # Create GIN index for fast full-text search
    execute """
    CREATE INDEX posts_search_idx ON posts USING GIN(search_vector)
    """
    
    # Auto-update search vector on insert/update
    execute """
    CREATE TRIGGER posts_search_vector_update
    BEFORE INSERT OR UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(search_vector, 'pg_catalog.english', content);
    """
    
    # Backfill existing posts
    execute """
    UPDATE posts SET search_vector = to_tsvector('english', content);
    """
    
    # Similar for projects table
    alter table(:projects) do
      add :search_vector, :tsvector
    end
    
    execute """
    CREATE INDEX projects_search_idx ON projects USING GIN(search_vector)
    """
    
    execute """
    CREATE TRIGGER projects_search_vector_update
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION
    tsvector_update_trigger(
      search_vector, 
      'pg_catalog.english', 
      title, 
      description
    );
    """
    
    execute """
    UPDATE projects 
    SET search_vector = to_tsvector('english', title || ' ' || description);
    """
  end
  
  def down do
    execute "DROP TRIGGER posts_search_vector_update ON posts"
    execute "DROP INDEX posts_search_idx"
    alter table(:posts), do: remove(:search_vector)
    
    execute "DROP TRIGGER projects_search_vector_update ON projects"
    execute "DROP INDEX projects_search_idx"
    alter table(:projects), do: remove(:search_vector)
  end
end
```

Search implementation:
```elixir
# lib/vibeslop/search.ex
defmodule Vibeslop.Search do
  import Ecto.Query
  
  def search_posts(query_string, limit \\ 20) do
    from(p in Post,
      where: fragment("search_vector @@ plainto_tsquery('english', ?)", ^query_string),
      order_by: [desc: fragment("ts_rank(search_vector, plainto_tsquery('english', ?))", ^query_string)],
      limit: ^limit
    )
    |> Repo.all()
  end
end
```

**D. Optimize Indexes**

Additional indexes for performance:
```elixir
defmodule Backend.Repo.Migrations.AddFeedOptimizationIndexes do
  use Ecto.Migration
  
  def change do
    # Composite index for "following" feed
    create index(:posts, [:user_id, :inserted_at])
    
    # Partial index for trending (recent posts only)
    create index(:posts, [:inserted_at, :likes_count], 
      where: "inserted_at > NOW() - INTERVAL '7 days'",
      name: :posts_trending_recent_idx
    )
    
    # Index for engagement counters
    create index(:posts, [:reposts_count])
    create index(:posts, [:comments_count])
    
    # Composite index for user's posts
    create index(:projects, [:user_id, :inserted_at])
  end
end
```

**E. Feed Query Optimization**

Efficient "Following" feed:
```elixir
def following_feed(user_id, limit \\ 50) do
  cache_key = "feed:following:#{user_id}"
  
  Vibeslop.Cache.get_or_compute(cache_key, 300, fn ->
    from(p in Post,
      join: f in Follow, on: f.following_id == p.user_id,
      where: f.follower_id == ^user_id,
      order_by: [desc: p.inserted_at],
      limit: ^limit,
      preload: [:user, :media, :quoted_post]
    )
    |> Repo.all()
  end)
end
```

#### Performance Targets

- Feed load time: <300ms
- Search results: <500ms
- Real-time updates: <100ms
- Concurrent users: 10K+

---

### Phase 2: 1M → 10M Users

**Timeline**: Year 2-3  
**Expected Scale**: 1M-10M users, 10M-100M posts

#### Additional Technologies

| Component | Add When | Technology | Purpose |
|-----------|----------|------------|---------|
| **Search Engine** | Search >500ms | Meilisearch | Typo tolerance, fast search |
| **Vector Database** | Need personalization | pgvector | Similar content recommendations |
| **Connection Pooling** | >100 connections | PgBouncer | Database connection management |
| **Read Replicas** | Read-heavy | PostgreSQL Replicas | Distribute read load |

#### Meilisearch Integration

**Why Meilisearch over Elasticsearch?**

| Feature | Meilisearch | Elasticsearch |
|---------|-------------|---------------|
| Setup time | Minutes | Days/Weeks |
| Ideal dataset | Millions | Billions |
| DevOps burden | Minimal | High |
| Typo tolerance | Built-in | Configuration required |
| Cost | Lower | Higher |

Installation:
```bash
# Docker deployment
docker run -d \
  --name meilisearch \
  -p 7700:7700 \
  -e MEILI_MASTER_KEY=YOUR_MASTER_KEY \
  -v $(pwd)/meili_data:/meili_data \
  getmeili/meilisearch:latest
```

Elixir integration:
```elixir
# mix.exs
{:meilisearch, "~> 0.20"}

# config/config.exs
config :meilisearch,
  endpoint: System.get_env("MEILISEARCH_URL") || "http://localhost:7700",
  api_key: System.get_env("MEILI_MASTER_KEY")
```

Sync strategy:
```elixir
defmodule Vibeslop.Search.Indexer do
  use GenServer
  
  def index_post(post) do
    document = %{
      id: post.id,
      content: post.content,
      user_id: post.user_id,
      username: post.user.username,
      created_at: DateTime.to_unix(post.inserted_at),
      likes_count: post.likes_count,
      tags: extract_tags(post.content)
    }
    
    Meilisearch.add_documents("posts", [document])
  end
  
  def search(query, filters \\ %{}) do
    Meilisearch.search("posts", query,
      filter: build_filters(filters),
      sort: ["created_at:desc"],
      limit: 20
    )
  end
end
```

#### pgvector for Recommendations

Add pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Migration:
```elixir
defmodule Backend.Repo.Migrations.AddVectorEmbeddings do
  use Ecto.Migration
  
  def up do
    execute "CREATE EXTENSION IF NOT EXISTS vector"
    
    alter table(:projects) do
      add :embedding, :vector, size: 384
    end
    
    create index(:projects, [:embedding], using: :ivfflat)
  end
end
```

Generate embeddings (use external API or local model):
```elixir
defmodule Vibeslop.AI.Embeddings do
  # Using all-MiniLM-L6-v2 (384 dimensions)
  
  def generate_project_embedding(project) do
    text = "#{project.title} #{project.description}"
    
    # Call embedding service
    {:ok, embedding} = EmbeddingService.encode(text)
    
    from(p in Project, where: p.id == ^project.id)
    |> Repo.update_all(set: [embedding: embedding])
  end
  
  def similar_projects(project_id, limit \\ 10) do
    project = Repo.get!(Project, project_id)
    
    from(p in Project,
      where: p.id != ^project_id,
      order_by: fragment("embedding <=> ?", ^project.embedding),
      limit: ^limit
    )
    |> Repo.all()
  end
end
```

#### Performance Targets

- Feed load time: <200ms
- Search results: <100ms
- Similar content: <150ms
- Concurrent users: 100K+

---

### Phase 3: 10M+ Users (Enterprise Scale)

**Timeline**: Year 3+  
**Expected Scale**: 10M+ users, 100M+ posts, 1B+ interactions

#### Advanced Technologies

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Search** | Elasticsearch | Billion-scale search, advanced analytics |
| **Vector DB** | Milvus/Qdrant | Billion-scale embeddings, GPU acceleration |
| **Graph DB** | NebulaGraph | Complex social graph queries |
| **Time-series** | TimescaleDB | Engagement analytics, metrics |
| **Partitioning** | PostgreSQL Partitioning | Split tables by time/user |
| **Sharding** | Citus | Horizontal database scaling |

#### TimescaleDB for Analytics

Convert engagement tracking to hypertables:
```sql
-- Convert engagement_hourly to TimescaleDB hypertable
SELECT create_hypertable('engagement_hourly', 'hour_bucket');

-- Continuous aggregate for trending
CREATE MATERIALIZED VIEW trending_scores_1h
WITH (timescaledb.continuous) AS
SELECT 
  content_id,
  content_type,
  time_bucket('1 hour', hour_bucket) as bucket,
  SUM(likes) + SUM(comments) * 13.5 + SUM(reposts) * 20 as score,
  SUM(impressions) as total_impressions
FROM engagement_hourly
GROUP BY content_id, content_type, bucket;

-- Retention policy (keep raw data for 90 days)
SELECT add_retention_policy('engagement_hourly', INTERVAL '90 days');

-- Compression (reduce storage by 95%)
ALTER TABLE engagement_hourly SET (
  timescaledb.compress,
  timescaledb.compress_segmentby = 'content_type,content_id'
);

SELECT add_compression_policy('engagement_hourly', INTERVAL '7 days');
```

#### Table Partitioning

Partition posts by month:
```sql
-- Convert posts to partitioned table
CREATE TABLE posts_new (LIKE posts INCLUDING ALL) 
  PARTITION BY RANGE (inserted_at);

-- Create partitions
CREATE TABLE posts_2026_01 PARTITION OF posts_new
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
  
CREATE TABLE posts_2026_02 PARTITION OF posts_new
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Migrate data
INSERT INTO posts_new SELECT * FROM posts;

-- Swap tables
DROP TABLE posts;
ALTER TABLE posts_new RENAME TO posts;

-- Auto-create future partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions()
RETURNS void AS $$
DECLARE
  start_date date;
  end_date date;
  partition_name text;
BEGIN
  FOR i IN 0..11 LOOP
    start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
    end_date := start_date + interval '1 month';
    partition_name := 'posts_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF posts FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date, end_date
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

#### Fan-out Strategy (Hybrid)

Implement hybrid push/pull for celebrity accounts:
```elixir
defmodule Vibeslop.Feed.Strategy do
  @follower_threshold 10_000
  
  def create_post(user, attrs) do
    post = Posts.create_post(user, attrs)
    
    follower_count = Accounts.follower_count(user.id)
    
    if follower_count < @follower_threshold do
      # Fan-out on write: Push to all followers
      fan_out_to_followers(user.id, post)
    else
      # Fan-out on read: Pull at request time
      # Just cache the post, don't push
      Cache.set("post:#{post.id}", post, ttl: 3600)
    end
    
    {:ok, post}
  end
  
  defp fan_out_to_followers(user_id, post) do
    # Push to Redis feed cache for each follower
    Accounts.follower_ids(user_id)
    |> Stream.chunk_every(1000)
    |> Stream.each(fn follower_ids ->
      Enum.each(follower_ids, fn follower_id ->
        Cache.prepend_to_list("feed:#{follower_id}", post.id, max: 500)
      end)
    end)
    |> Stream.run()
  end
end
```

---

## Decision Framework

### When to Add Each Technology

```
Start: PostgreSQL + Redis
   |
   ├─> Search slow (>500ms)
   |   └─> Add Meilisearch
   |
   ├─> Need recommendations
   |   └─> Add pgvector
   |
   ├─> Read-heavy (>80% reads)
   |   └─> Add read replicas
   |
   ├─> Connection saturation
   |   └─> Add PgBouncer
   |
   ├─> Tables >100M rows
   |   └─> Add partitioning
   |
   ├─> Analytics complex
   |   └─> Add TimescaleDB
   |
   ├─> Search dataset >10M
   |   └─> Consider Elasticsearch
   |
   ├─> Embeddings >10M
   |   └─> Consider Milvus/Qdrant
   |
   └─> Tables >1B rows
       └─> Consider Citus sharding
```

### Technology Comparison Matrix

| Use Case | Phase 1 | Phase 2 | Phase 3 |
|----------|---------|---------|---------|
| **Search** | PostgreSQL FTS | Meilisearch | Elasticsearch |
| **Caching** | Redis | Redis | Redis + CDN |
| **Vectors** | N/A | pgvector | Milvus/Qdrant |
| **Analytics** | PostgreSQL | PostgreSQL | TimescaleDB |
| **Graph** | PostgreSQL | PostgreSQL | NebulaGraph |
| **Scaling** | Vertical | Read replicas | Sharding (Citus) |

---

## Database Schema Enhancements

### Current Schema Strengths

✅ Denormalized counters (`likes_count`, `comments_count`, `reposts_count`)  
✅ `engagement_hourly` table for time-series tracking  
✅ Proper indexes on `inserted_at` and foreign keys  
✅ UUID primary keys for distributed systems  

### Recommended Additions

#### 1. Trending Score Column

```elixir
defmodule Backend.Repo.Migrations.AddTrendingScore do
  use Ecto.Migration
  
  def change do
    alter table(:posts) do
      add :trending_score, :float, default: 0.0
      add :trending_updated_at, :utc_datetime
    end
    
    alter table(:projects) do
      add :trending_score, :float, default: 0.0
      add :trending_updated_at, :utc_datetime
    end
    
    # Index for trending queries
    create index(:posts, [:trending_score, :inserted_at],
      where: "inserted_at > NOW() - INTERVAL '7 days'"
    )
  end
end
```

#### 2. Feed Materialization Table (Future)

For Phase 3, consider pre-computed feeds:
```sql
CREATE TABLE user_feeds (
  user_id UUID NOT NULL,
  post_id UUID NOT NULL,
  score FLOAT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE INDEX idx_user_feeds_user_score ON user_feeds(user_id, score DESC);
```

#### 3. Impression Tracking Optimization

Your current `impressions` table is good. Consider partitioning for Phase 3:
```sql
-- Partition by month
ALTER TABLE impressions 
  PARTITION BY RANGE (viewed_at);
```

---

## API Design Considerations

### Feed Endpoints

```elixir
# Router
get "/feed/for-you", FeedController, :for_you
get "/feed/following", FeedController, :following
get "/feed/trending", FeedController, :trending

# Controller
defmodule VibeslOpWeb.FeedController do
  use VibeslOpWeb, :controller
  
  def for_you(conn, params) do
    user = conn.assigns.current_user
    
    posts = 
      Vibeslop.Feed.for_you_feed(user.id,
        limit: params["limit"] || 50,
        cursor: params["cursor"]
      )
    
    render(conn, "feed.json", posts: posts)
  end
  
  def trending(conn, params) do
    timeframe = params["timeframe"] || "24h"
    
    posts = Vibeslop.Feed.trending_feed(
      timeframe: timeframe,
      limit: params["limit"] || 50
    )
    
    render(conn, "feed.json", posts: posts)
  end
end
```

### Cursor-based Pagination

For infinite scroll:
```elixir
defmodule Vibeslop.Feed.Pagination do
  def paginate(query, cursor, limit) do
    posts = 
      if cursor do
        from(q in query, 
          where: q.inserted_at < ^cursor,
          limit: ^limit
        )
      else
        from(q in query, limit: ^limit)
      end
      |> Repo.all()
    
    next_cursor = 
      if length(posts) == limit do
        List.last(posts).inserted_at
      else
        nil
      end
    
    %{
      items: posts,
      next_cursor: next_cursor,
      has_more: !is_nil(next_cursor)
    }
  end
end
```

---

## Performance Monitoring

### Key Metrics to Track

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Feed load time (p95) | <300ms | >500ms |
| Search latency (p95) | <500ms | >1000ms |
| Database connections | <80% pool | >90% pool |
| Cache hit rate | >80% | <60% |
| Query time (p95) | <100ms | >300ms |

### Monitoring Tools

```elixir
# Add Telemetry metrics
defmodule Vibeslop.Telemetry do
  use Supervisor
  
  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end
  
  def init(_arg) do
    children = [
      {:telemetry_poller, measurements: periodic_measurements(), period: 10_000}
    ]
    
    Supervisor.init(children, strategy: :one_for_one)
  end
  
  defp periodic_measurements do
    [
      {Vibeslop.Telemetry, :measure_feed_performance, []},
      {Vibeslop.Telemetry, :measure_cache_hit_rate, []},
      {Vibeslop.Telemetry, :measure_db_connections, []}
    ]
  end
end
```

---

## Cost Estimates

### Phase 1 (PostgreSQL + Redis)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|--------------|
| PostgreSQL | Supabase/Neon | Pro | $25-50 |
| Redis | Upstash | Pay-as-go | $10-30 |
| Total | | | **$35-80/mo** |

### Phase 2 (+ Meilisearch + pgvector)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|--------------|
| PostgreSQL | Supabase | Pro/Team | $100-200 |
| Redis | Upstash | Pro | $50-100 |
| Meilisearch | Self-hosted | VPS | $20-50 |
| Total | | | **$170-350/mo** |

### Phase 3 (Enterprise Scale)

| Service | Provider | Tier | Monthly Cost |
|---------|----------|------|--------------|
| PostgreSQL | AWS RDS | Multi-AZ | $500-2000 |
| Redis | ElastiCache | Cluster | $200-500 |
| Elasticsearch | Elastic Cloud | Standard | $300-1000 |
| Milvus | Zilliz Cloud | Standard | $200-800 |
| Total | | | **$1,200-4,300/mo** |

---

## Testing Strategy

### Performance Testing

```elixir
# test/performance/feed_performance_test.exs
defmodule Vibeslop.FeedPerformanceTest do
  use Vibeslop.DataCase
  
  @tag :performance
  test "trending feed loads under 300ms" do
    # Create test data
    users = insert_list(100, :user)
    posts = insert_list(1000, :post, users: users)
    
    # Warm cache
    Vibeslop.Feed.trending_feed()
    
    # Measure
    {time, _result} = :timer.tc(fn ->
      Vibeslop.Feed.trending_feed(limit: 50)
    end)
    
    assert time < 300_000, "Feed took #{time}μs (>300ms)"
  end
end
```

### Load Testing

Use k6 or similar:
```javascript
// load_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp to 100 users
    { duration: '5m', target: 100 },   // Stay at 100
    { duration: '2m', target: 1000 },  // Ramp to 1000
    { duration: '5m', target: 1000 },  // Stay at 1000
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% under 500ms
  },
};

export default function () {
  let res = http.get('https://vibeslop.com/api/feed/for-you');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## Migration Checklist

### Phase 1 Implementation Checklist

- [ ] Set up Redis instance (Upstash or self-hosted)
- [ ] Install `redix` and `castore` Elixir packages
- [ ] Implement feed caching layer
- [ ] Add full-text search GIN indexes to posts and projects
- [ ] Implement trending algorithm with engagement weights
- [ ] Add composite indexes for feed queries
- [ ] Set up telemetry and performance monitoring
- [ ] Load test with 1000 concurrent users
- [ ] Document cache invalidation strategy
- [ ] Set up Redis backup/persistence

### Phase 2 Migration Checklist

- [ ] Evaluate Meilisearch vs PostgreSQL FTS performance
- [ ] Deploy Meilisearch instance
- [ ] Implement document sync pipeline
- [ ] Add pgvector extension to PostgreSQL
- [ ] Implement embedding generation pipeline
- [ ] Deploy connection pooler (PgBouncer)
- [ ] Set up read replica(s)
- [ ] Update application to use read replicas for queries
- [ ] Benchmark improvements
- [ ] Update monitoring dashboards

### Phase 3 Migration Checklist

- [ ] Evaluate Elasticsearch vs Meilisearch at scale
- [ ] Plan table partitioning strategy
- [ ] Implement TimescaleDB for analytics
- [ ] Consider graph database for social graph
- [ ] Evaluate Citus for horizontal scaling
- [ ] Plan sharding key strategy
- [ ] Implement hybrid fan-out strategy
- [ ] Deploy vector database (Milvus/Qdrant)
- [ ] Set up multi-region deployment
- [ ] Implement CDN for global performance

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Premature optimization** | Wasted development time | Follow phased approach strictly |
| **Cache stampede** | Database overload | Use probabilistic early expiration |
| **Data inconsistency** | Poor UX | Implement eventual consistency carefully |
| **Search sync lag** | Stale results | Monitor sync delay, show freshness |
| **Viral post overload** | System crash | Rate limiting, queue-based processing |
| **Celebrity fan-out** | Write amplification | Hybrid push/pull strategy |

---

## Key Decisions

### ✅ Confirmed Decisions

| Decision | Rationale |
|----------|-----------|
| **Start with PostgreSQL only** | Operational simplicity, sufficient for Phase 1 |
| **Add Redis early** | Critical for feed performance and caching |
| **Meilisearch over Elasticsearch** | Better for small-medium scale, easier ops |
| **pgvector over dedicated vector DB** | Simpler integration, sufficient for Phase 2 |
| **Time-decay trending algorithm** | Balances engagement and recency |
| **Hybrid fan-out strategy** | Handles both regular and celebrity users |

### 🤔 Deferred Decisions

- Exact trending score formula (tune based on user behavior)
- Celebrity threshold (start with 10K followers, adjust)
- Cache TTL durations (start with 5min, adjust)
- When to migrate to Elasticsearch (monitor search performance)
- Sharding strategy (if/when needed)

---

## References

### Industry Engineering Blogs

1. [Instagram's Journey to 1000 Models](https://engineering.fb.com/2025/05/21/production-engineering/journey-to-1000-models-scaling-instagrams-recommendation-system/) - Meta Engineering
2. [Twitter's Recommendation Algorithm](https://blog.x.com/engineering/en_us/topics/open-source/2023/twitter-recommendation-algorithm) - X Engineering
3. [How Instagram Still Runs on PostgreSQL](https://techpreneurr.medium.com/how-instagram-still-runs-on-postgresql-while-everyone-else-chases-nosql-4aa099fa044b) - Medium

### Technical Comparisons

4. [Postgres Full-Text Search vs Elasticsearch](https://neon.com/blog/postgres-full-text-search-vs-elasticsearch) - Neon
5. [Meilisearch vs Elasticsearch](https://meilisearch.com/blog/meilisearch-vs-elasticsearch) - Meilisearch
6. [Vector Database Comparison 2025](https://www.firecrawl.dev/blog/best-vector-databases-2025) - Firecrawl

### System Design Guides

7. [News Feed System Design Guide](https://grokkingthesystemdesign.com/guides/news-feed-system-design/) - Grokking System Design
8. [Fan-Out Patterns for Distributed Systems](https://scalabrix.medium.com/scaling-reads-and-writes-inside-fan-out-patterns-for-distributed-systems-part-1-ce84d5c3ebd0) - Medium
9. [Designing a Scalable Likes Counting System](https://blog.algomaster.io/p/designing-a-scalable-likes-counting-system) - AlgoMaster

### Database-Specific

10. [TimescaleDB for Real-Time Analytics](https://www.timescale.com/blog/how-timescale-solves-real-time-analytics-in-postgres) - Timescale
11. [Sharding at Instagram Case Study](https://systemdr.substack.com/p/sharding-at-instagram-case-study) - System Design
12. [Phoenix Framework 2025](https://redskydigital.com/us/phoenix-framework-2025-powering-high-performance-web-applications/) - Red Sky Digital

### GitHub Examples

13. [Twitter's Recommendation Algorithm (Open Source)](https://github.com/twitter/the-algorithm) - GitHub
14. [Scalable Likes System Example](https://github.com/JoelKong/scalable-likes-system) - GitHub

---

## Appendix

### Useful SQL Queries

**Check table sizes:**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Check slow queries:**
```sql
SELECT 
  query,
  mean_exec_time,
  calls,
  total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;
```

**Check index usage:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;
```

### Redis Commands Reference

**Feed caching:**
```redis
# Set feed with TTL
SETEX feed:user:123:for-you 300 '{"posts":[...]}'

# Get feed
GET feed:user:123:for-you

# Invalidate user's cache
DEL feed:user:123:for-you feed:user:123:following

# Increment counter
INCR post:456:likes_count

# Sorted set for trending
ZADD trending:24h 125.7 post:456
ZREVRANGE trending:24h 0 49 WITHSCORES
```

---

**Document Status**: Living document - update as implementation progresses and new patterns emerge.

**Last Review**: January 20, 2026  
**Next Review**: Upon reaching 100K users or encountering performance issues
