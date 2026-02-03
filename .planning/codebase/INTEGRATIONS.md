# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**AI/LLM:**
- OpenRouter API - Multi-model AI inference service
  - SDK/Client: `req` HTTP client (custom wrapper in `lib/backend/ai/openrouter.ex`)
  - Auth: `OPENROUTER_API_KEY` environment variable
  - Models configured:
    - Chat: `x-ai/grok-4.1-fast` (default text generation)
    - Image: `google/gemini-3-pro-image-preview` (image generation)
    - Vision: `bytedance-seed/seed-1.6-flash` (image analysis)
  - Capabilities: Chat completions, image generation, image analysis/vision
  - Usage: Project generation from GitHub repos, image generation, content improvement, moderation

**GitHub:**
- GitHub REST API - Repository data and developer metrics
  - SDK/Client: `req` HTTP client (wrapper in `lib/backend/github/client.ex`)
  - Auth: OAuth token (via GitHub OAuth strategy)
  - Endpoints used:
    - User repos listing (`/user/repos`)
    - Repository details (`/repos/{owner}/{repo}`)
    - README content (`/repos/{owner}/{repo}/readme`)
    - Language breakdown (`/repos/{owner}/{repo}/languages`)
    - Topics (`/repos/{owner}/{repo}/topics`)
    - File tree and content (`/repos/{owner}/{repo}/git/trees`)
    - User public stats (`/users/{username}`)
    - Search API for commits, PRs, issues (last 365 days)
  - Usage: Portfolio project import, developer scoring, logo detection

## Data Storage

**Databases:**
- PostgreSQL 16-alpine (primary)
  - Connection: Docker container on localhost:5433 (dev)
  - Client: Postgrex driver via Ecto ORM
  - Environment: `DATABASE_URL` (prod)

**File Storage:**
- Local filesystem only (images stored as URLs in database)
- No S3, cloud storage, or CDN integration detected

**Caching:**
- Oban job queue - Background job storage and execution
- Hammer ETS backend - In-memory rate limiting cache (2-hour expiry)
- No Redis, Memcached, or distributed cache

## Authentication & Identity

**Auth Provider:**
- GitHub OAuth 2.0 (Ueberauth strategy)
  - Implementation: Ueberauth with `ueberauth_github` strategy
  - Scope: `user:email` (read GitHub email)
  - Token storage: JWT in localStorage (frontend)
  - Backend endpoints:
    - `GET /api/auth/github` - Initiate OAuth flow
    - `GET /api/auth/github/callback` - OAuth callback (handled by Ueberauth)
    - `POST /api/auth/logout` - Clear session

**JWT:**
- Token signing: `joken` 2.6 library
- Secret: `JWT_SECRET` environment variable
- Storage: localStorage as `vibeslop_token`
- Verification: Via auth plugs (`backend_web/plugs/auth.ex`, `optional_auth.ex`)

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, Rollbar, etc.)

**Logs:**
- Elixir Logger (standard)
- Format: `[$level] $message` in dev, structured in prod
- Telemetry metrics collection via `telemetry_metrics` and `telemetry_poller`

## CI/CD & Deployment

**Hosting:**
- Not configured (application is framework-ready)

**CI Pipeline:**
- Not detected (.github/workflows not visible)

## Webhooks & Callbacks

**Incoming:**
- GitHub OAuth callback: `/api/auth/github/callback`
- No other webhook integrations detected

**Outgoing:**
- GitHub API only (read-only, no webhook outbound calls)

## Environment Configuration

**Required env vars:**
- `GITHUB_CLIENT_ID` - GitHub OAuth app client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth app client secret
- `JWT_SECRET` - JWT signing key
- `OPENROUTER_API_KEY` - OpenRouter API key
- `ADMIN_EMAIL` - Administrator email address

**Optional env vars (with defaults):**
- `FRONTEND_URL` - Frontend base URL (default: http://localhost:5173)
- `FRONTEND_URL` - Used in OpenRouter requests for HTTP-Referer header
- `DATABASE_URL` - PostgreSQL connection string (required in production)
- `PHX_HOST` - Production hostname (required in production)
- `SECRET_KEY_BASE` - Session encryption key (required in production)
- `POOL_SIZE` - Database connection pool size (default: 10)
- `ECTO_IPV6` - Enable IPv6 connections

**Secrets location:**
- Development: `.env` file (loaded via Dotenvy)
- Production: Environment variables from deployment platform
- Never committed to version control

## API Integration Details

**Frontend API Client:**
- Location: `frontend/src/lib/api.ts`
- Base URL: `VITE_API_URL` (default: `/api`)
- Uses native Fetch API (no axios, got, or SWR)
- Auth: Bearer token in Authorization header
- Error handling: JSON error parsing with fallback

**Backend API:**
- JSON-based REST API
- Base path: `/api/`
- CORS enabled via `corsica` 2.1
- Endpoints: Posts, projects, users, gigs, AI generation, GitHub integration, admin, search, notifications, conversations, comments, likes, reposts, bookmarks

## Rate Limiting

**Implementation:**
- Hammer library with ETS backend
- 2-hour expiry, 10-minute cleanup interval
- No specific endpoint limits configured in visible code

## Background Jobs

**Job Queue:**
- Oban 2.18 job processor
- Queues: `default` (10 workers), `developer_scores` (2 workers)
- Plugins: Pruner, Cron scheduler
- Scheduled jobs: Developer score calculation (daily at 3 AM UTC)

## Mailer

**Configuration:**
- Swoosh 1.16 email library
- Dev: Local adapter (emails visible at `/dev/mailbox`)
- Prod: Configured externally (Mailgun example in config comments)

---

*Integration audit: 2026-02-02*
