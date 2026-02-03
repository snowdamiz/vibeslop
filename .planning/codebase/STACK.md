# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- Elixir 1.15+ - Backend application runtime
- TypeScript 5.9.3 - Frontend type system and source language
- JavaScript (ES modules) - Frontend runtime

**Secondary:**
- SQL - Database queries via Ecto

## Runtime

**Environment:**
- Erlang/OTP (via Elixir) - Backend server runtime
- Node.js 18.0.0+ - Frontend build and dev tooling

**Package Manager:**
- Mix (Elixir) - Backend dependency management
- npm - Frontend and monorepo root dependency management
- Lockfile: `mix.lock` (backend), `package-lock.json` (frontend/root)

## Frameworks

**Core:**
- Phoenix 1.8.3 - Elixir web framework
- React 19.2.0 - Frontend UI framework
- React Router DOM 7.12.0 - Frontend routing

**Build/Dev:**
- Vite 7.2.4 - Frontend bundler and dev server
- Tailwind CSS 4.1.18 - Utility-first CSS framework
- ESLint 9.39.1 - Frontend linting

**Testing:**
- ExUnit (included with Elixir) - Backend unit/integration tests
- Mix test runner - Backend test execution
- Not detected for frontend (no Jest, Vitest, etc.)

## Key Dependencies

**Critical:**
- `phoenix_ecto` 4.5 - Database integration
- `ecto_sql` 3.13 - SQL adapter for Ecto ORM
- `postgrex` - PostgreSQL driver
- `req` 0.5 - HTTP client for external API calls

**Authentication & OAuth:**
- `ueberauth` 0.10 - OAuth framework
- `ueberauth_github` 0.8 - GitHub OAuth strategy
- `joken` 2.6 - JWT token generation and verification

**API & Web:**
- `bandit` 1.5 - Web server (replaces Cowboy)
- `corsica` 2.1 - CORS middleware
- `swoosh` 1.16 - Mailer abstraction (Local adapter in dev)
- `jason` 1.2 - JSON encoding/decoding

**Background Jobs:**
- `oban` 2.18 - Background job processor

**Rate Limiting & Infrastructure:**
- `hammer` 6.2 - Rate limiting
- `dns_cluster` 0.2.0 - Distributed clustering support
- `telemetry_metrics` 1.0, `telemetry_poller` 1.0 - Metrics collection

**Development Only:**
- `dotenvy` 0.8.0 - Environment variable loading from .env

**Frontend UI Components:**
- `@radix-ui/react-*` - Headless UI component library (accordion, avatar, dialog, etc.)
- `lucide-react` 0.562.0 - Icon library
- `framer-motion` 12.27.0 - Animation library
- `react-markdown` 10.1.0 - Markdown rendering
- `@tiptap/react` 3.15.3, `@tiptap/starter-kit` 3.15.3 - Rich text editor
- `marked` 17.0.1 - Markdown parsing
- `tippy.js` 6.3.7 - Tooltip positioning

## Configuration

**Environment:**
- Backend: `config/config.exs` (base), `config/dev.exs` (development), `config/prod.exs` (production), `config/runtime.exs` (runtime)
- Frontend: `vite.config.ts` with `@vitejs/plugin-react`
- Root: `package.json` with monorepo scripts

**Key Configs Required:**
- `GITHUB_CLIENT_ID` - OAuth client ID
- `GITHUB_CLIENT_SECRET` - OAuth client secret
- `JWT_SECRET` - JWT signing secret
- `OPENROUTER_API_KEY` - AI API key
- `FRONTEND_URL` - Frontend URL for CORS/redirects (default: http://localhost:5173)
- `ADMIN_EMAIL` - Administrator email
- `DATABASE_URL` (production only) - PostgreSQL connection string

**Build:**
- Backend: Mix (Elixir built-in)
- Frontend: Vite with TypeScript compilation via `tsc -b`

## Platform Requirements

**Development:**
- Docker (for PostgreSQL 16-alpine via docker-compose)
- PostgreSQL 16-alpine - Database (via docker-compose on port 5433)
- Node.js 18.0.0+
- Elixir 1.15+

**Production:**
- PostgreSQL database
- Erlang/OTP runtime
- HTTP server (Bandit)
- Environment variable configuration for secrets

## Database

**Primary:**
- PostgreSQL 16-alpine
- Connection: `ecto://postgres:postgres@localhost:5433/backend_dev` (dev)
- ORM: Ecto 3.13 with `phoenix_ecto` integration
- Migrations: Located in `priv/repo/migrations/`
- Features: Full-text search indexes, trigram indexes for fuzzy search, Oban jobs table

## Caching

**State Management:**
- Frontend: React Context (not Redux or other state libraries visible)
- Backend: Oban job queue for background processing, Hammer for rate limiting cache

---

*Stack analysis: 2026-02-02*
