# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Full-stack monorepo with decoupled frontend and backend tiers using context-driven (Ecto) domain-driven design on the server and React Context with hooks for state management on the client.

**Key Characteristics:**
- **Frontend:** React 19 with React Router v7 for navigation, composable context providers for auth/theme/compose state, page-based routing
- **Backend:** Phoenix/Elixir REST API with domain-oriented contexts (Accounts, Content, Social, Feed, Gigs, etc.), database-first ORM via Ecto
- **API Contract:** JSON request/response with token-based auth via JWT, cursor pagination for feeds, type-safe client definitions
- **Separation:** Frontend exclusively communicates via `/api/*` endpoints; no server rendering or LiveView integration

## Layers

**Frontend Presentation Layer:**
- Purpose: React components organized by domain (feed, gigs, messages, admin) with reusable UI primitives
- Location: `src/pages/`, `src/components/`
- Contains: Page components (`Home.tsx`, `ProjectDetail.tsx`, `GigDetail.tsx`), domain components (Feed, Comments, Gigs), UI components (Radix + Tailwind)
- Depends on: React Router, Context providers (Auth, Theme, Compose), API client
- Used by: App routing and layout shell

**Frontend State Management Layer:**
- Purpose: Global state for auth status, theme preference, and compose dialog orchestration
- Location: `src/context/` (AuthContext, ThemeContext, ComposeContext)
- Contains: Context definitions, provider components, custom hooks (`useAuth()`, `useCompose()`)
- Depends on: API client for user data, localStorage for persistence
- Used by: All pages and components that need auth status or compose access

**Frontend API Client Layer:**
- Purpose: Centralized HTTP communication with type-safe request/response definitions
- Location: `src/lib/api.ts`
- Contains: Fetch wrapper, endpoint methods, TypeScript interfaces for all data models (User, Post, Gig, Notification, etc.), token management
- Depends on: Fetch API, environment variables (`VITE_API_URL`)
- Used by: Context providers and page components via API calls

**Frontend Utilities & Hooks:**
- Purpose: Reusable logic and effects
- Location: `src/hooks/` (useImpressionTracker, useSearchHistory, useSEO, etc.), `src/lib/utils.ts`
- Contains: Custom React hooks for tracking, debouncing, SEO metadata
- Depends on: API client, React core
- Used by: Components and pages for behavior composition

**Backend Context Layer (Domain Logic):**
- Purpose: Domain-organized business logic and database queries
- Location: `lib/backend/*.ex` (accounts.ex, content.ex, social.ex, feed.ex, gigs.ex, etc.)
- Contains: Public API functions that manipulate domain entities, Repo queries, business rules
- Depends on: Database via `Backend.Repo`, Ecto schemas
- Used by: Controllers and workers for all operations

**Backend Schema/Model Layer:**
- Purpose: Ecto changesets and schema definitions
- Location: `lib/backend/[domain]/*.ex` (accounts/user.ex, content/post.ex, social/like.ex, etc.)
- Contains: Schema definitions with associations, validation rules, type definitions
- Depends on: Ecto macros
- Used by: Context modules for type safety and queries

**Backend Controller Layer:**
- Purpose: HTTP request handling and response formatting
- Location: `lib/backend_web/controllers/`
- Contains: One controller per resource type (PostController, ProjectController, UserController, etc.), action handlers, parameter parsing, fallback error handling
- Depends on: Context modules, plug middleware (auth, optional auth)
- Used by: Router to dispatch HTTP requests

**Backend Router Layer:**
- Purpose: HTTP route definition and pipeline orchestration
- Location: `lib/backend_web/router.ex`
- Contains: Route scopes grouped by auth requirement, plug pipelines (:api, :auth, :authenticated, :optional_auth), CORS configuration
- Depends on: Controllers, plugs
- Used by: Endpoint to define all accessible routes

**Backend Job Worker Layer:**
- Purpose: Async job processing
- Location: `lib/backend/workers/`
- Contains: Oban job workers (e.g., DeveloperScoreWorker), background tasks
- Depends on: Oban job queue, domain context modules
- Used by: Application startup and scheduled jobs

**Backend AI Integration Layer:**
- Purpose: Third-party AI service integration
- Location: `lib/backend/ai/`
- Contains: OpenRouter client, content moderation, project generation, rate limiting
- Depends on: HTTP client (Req), API credentials from env
- Used by: AI controller and content validation workflows

## Data Flow

**Authentication Flow:**

1. User clicks "Sign in with GitHub" on frontend (`src/pages/SignIn.tsx`)
2. Frontend redirects to `GET /api/auth/github`
3. Backend (`lib/backend_web/controllers/auth_controller.ex`) initiates Ueberauth OAuth
4. GitHub redirects to `GET /api/auth/github/callback` with OAuth code
5. Backend exchanges code for GitHub user data via Ueberauth
6. `Backend.Accounts.find_or_create_from_github()` finds or creates user, returns JWT token
7. Frontend receives token in callback handler (`src/pages/AuthCallback.tsx`)
8. `api.setToken()` stores JWT in localStorage
9. `AuthContext` fetches current user via `GET /api/me` on next render
10. User is authenticated and routed to onboarding or home

**Feed Data Flow:**

1. Frontend Home page loads, calls `api.getPosts()` with optional cursor for pagination
2. Frontend sends `GET /api/posts?feed=for-you&limit=20&cursor=...`
3. Backend `PostController.index()` invokes `Backend.Feed.for_you_feed()` context
4. Feed context:
   - Queries posts and projects from past 7 days with engagement scoring
   - Calculates score = (reposts*20 + comments*13.5 + likes*1) with time decay
   - If fewer than 30 items, backfills with older content by engagement only
   - Applies preference boost (1.5x) to projects matching user's favorite AI tools/stacks
   - Returns paginated results with cursor for next page
5. Backend returns JSON array with engagement counts, media, user data, and next cursor
6. Frontend `Feed.tsx` renders items via `Post.tsx` component, subscribes to compose context for optimistic updates
7. User scrolls, frontend sends next cursor, backend returns next page

**Content Creation Flow:**

1. User types in compose box (`src/components/feed/ComposeBox.tsx`)
2. User submits post, `GlobalComposeDialog` sends `POST /api/posts` with content
3. Backend `PostController.create()` validates via `Content.create_post()` context
4. Database insert, backend returns created post with `inserted_at`
5. Frontend receives response, updates via `ComposeContext.onNewPostCreated()`
6. All subscribed components (Feed) get notified and prepend new post optimistically
7. User sees post immediately without page refresh

**Engagement Interaction Flow:**

1. User clicks like/repost/bookmark button on post
2. Frontend sends `POST /api/likes` (or `/reposts`, `/bookmarks`) with post_id
3. Backend `LikeController.toggle()` calls `Social.like_post()` context
4. Database upsert/delete, backend returns updated engagement counts
5. Frontend optimistically updates button state and count display
6. If API fails, frontend reverts UI state

**Search and Filtering Flow:**

1. User enters search query in search bar
2. Frontend debounces input (500ms) via `useDebouncedSearch` hook
3. Frontend sends `GET /search?q=...&tools=...&stacks=...`
4. Backend `SearchController.index()` calls `Backend.Search.search()` context
5. Context performs full-text search on posts/projects + filters by catalog tags
6. Returns ranked results, frontend displays in real-time dropdown or page

**State Management:**

- **Auth State:** `AuthContext` holds user, loading flag, login/logout functions. Persists JWT in localStorage. Synced on mount via `api.getCurrentUser()`.
- **Theme State:** `ThemeContext` holds dark/light mode toggle, applies via `document.documentElement.class`.
- **Compose State:** `ComposeContext` manages open/closed dialog, quoted item, AI generator visibility. Subscribers (Feed component) listen for new post notifications to prepend items.
- **Page State:** Individual pages manage local state (filters, sorting, pagination cursor) via `useState`.

## Key Abstractions

**Context Abstraction (Backend):**
- Purpose: Encapsulate domain logic and database queries
- Examples: `Backend.Content`, `Backend.Social`, `Backend.Feed`, `Backend.Accounts`
- Pattern: Public API functions accept options keyword list, return tuples of {:ok, data} or {:error, reason}

**React Context Abstraction (Frontend):**
- Purpose: Global state without prop drilling
- Examples: `AuthContext`, `ThemeContext`, `ComposeContext`
- Pattern: Context provider wraps app, custom hooks expose state and methods

**Controller Abstraction (Backend):**
- Purpose: HTTP request dispatch with shared error handling
- Pattern: Leverage `FallbackController` for consistent error responses across all endpoints

**Schema/Changeset Abstraction (Backend):**
- Purpose: Data validation and transformation before persistence
- Pattern: `Ecto.Changeset` with custom validators (e.g., `validate_username_format`)

**API Client Abstraction (Frontend):**
- Purpose: Centralized HTTP communication
- Pattern: Single export `api` object with methods per resource (getUser, createPost, etc.), token management, error handling

## Entry Points

**Frontend Entry Point:**
- Location: `src/main.tsx`
- Triggers: Browser loads HTML, script tag runs React
- Responsibilities: Mount React app to DOM, wrap with BrowserRouter, AuthProvider, ThemeProvider; App component handles layout and routing

**Frontend App Router:**
- Location: `src/App.tsx`
- Triggers: After auth context initializes
- Responsibilities: Conditionally render auth pages (centered), landing page (header/footer), or app shell (sidebars); load appropriate page component per route

**Backend Endpoint:**
- Location: `lib/backend_web/endpoint.ex`
- Triggers: Application startup via `Backend.Application` supervisor
- Responsibilities: Configure plugs (parsers, telemetry, sessions), mount router, serve static files, configure LiveView sockets (unused)

**Backend Router:**
- Location: `lib/backend_web/router.ex`
- Triggers: Endpoint mounts router, HTTP request arrives
- Responsibilities: Match route to scope, apply auth pipelines, dispatch to controller action

**Backend Application Supervisor:**
- Location: `lib/backend/application.ex`
- Triggers: OTP application start
- Responsibilities: Start child processes (Telemetry, Repo, PubSub, Oban job queue, Endpoint); schedule initial developer score calculation job

## Error Handling

**Strategy:** Type-driven error handling with Ecto changesets on write operations, optional auth enforcement via plugs, fallback controller for consistent JSON error responses.

**Patterns:**

**Backend Error Handling:**
- Changeset validation errors return 422 Unprocessable Entity with changeset errors nested under `:errors` key
- Authorization failures (require auth but token missing/invalid) return 401 Unauthorized
- Resource not found returns 404 Not Found
- FallbackController catches all action errors and formats as JSON

**Frontend Error Handling:**
- API client wraps fetch and throws on non-2xx status
- Components catch errors in try/catch during API calls, show error toast or fallback UI
- Auth context catches user fetch failures, clears token, redirects to signin
- Form components display validation errors from changeset response

## Cross-Cutting Concerns

**Logging:**
- **Frontend:** Console.log/error in development; no centralized logging
- **Backend:** Phoenix telemetry via `BackendWeb.Telemetry`, logs to stdout

**Validation:**
- **Frontend:** HTML5 form validation, optional TypeScript types
- **Backend:** Ecto changesets with custom validators in schema definitions

**Authentication:**
- **Frontend:** JWT stored in localStorage, passed as Authorization Bearer header via API client
- **Backend:** Two plugs: `BackendWeb.Plugs.Auth` (requires valid token), `BackendWeb.Plugs.OptionalAuth` (enriches conn if valid token present)

**Rate Limiting:**
- **Backend:** Hammer library for global rate limiting; AI endpoints have per-user rate limiting via `Backend.AI.RateLimiter`

**Pagination:**
- **Frontend:** Cursor-based for feeds (score:id), offset-based for admin list views
- **Backend:** Cursor pagination in Feed context for performance; offset pagination as fallback in explore endpoints

**CORS:**
- **Backend:** Corsica plug configured to allow all origins and headers (development-friendly, should restrict in production)

---

*Architecture analysis: 2026-02-02*
