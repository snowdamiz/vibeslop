# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Runner:**
- ExUnit (Elixir backend) - included with Elixir
- No testing framework configured for frontend (React/TypeScript)

**Config:**
- Backend: `test/test_helper.exs`
- Frontend: No test configuration detected

**Run Commands:**

```bash
# Backend - run all tests
cd backend && mix test

# Backend - run with warnings as errors (precommit)
cd backend && mix compile --warnings-as-errors

# Backend - full precommit check
cd backend && mix precommit
```

## Test File Organization

**Backend:**
- Location: Separate directory structure (`test/backend_web/controllers/`, `test/support/`)
- File naming: `*_test.exs` suffix (e.g., `error_json_test.exs`)
- Structure: Tests co-located with their test helper modules in `test/support/`

**Frontend:**
- No test files detected in the codebase
- No test directory structure created
- Location pattern would follow: `src/**/*.test.tsx` or `src/**/*.spec.tsx` (not implemented)

## Test Structure

**Elixir Backend:**
- ExUnit test format with setup/teardown
- Database sandbox mode: `Ecto.Adapters.SQL.Sandbox.mode(Backend.Repo, :manual)`

**Example from `test/test_helper.exs`:**
```elixir
ExUnit.start()
Ecto.Adapters.SQL.Sandbox.mode(Backend.Repo, :manual)
```

**Frontend:**
- No tests created yet
- Pattern would follow Vitest or Jest conventions (not yet determined)

## Mocking

**Framework:** Not explicitly configured

**Patterns:**
- Backend: Elixir's built-in mocking with ExUnit
- Frontend: No mocking framework integrated

**What to Mock:**
- Backend: Database queries (handled by Ecto sandbox), external API calls
- Frontend: API calls (not yet tested), external dependencies

**What NOT to Mock:**
- Backend: Core business logic functions (test actual behavior)
- Frontend: Component rendering and state management (test actual behavior)

## Fixtures and Factories

**Test Data:**
- Backend: Uses Ecto.Changeset and schema validation
- No explicit factory pattern detected (no ExMachina or similar)

**Location:**
- Backend: `test/support/` directory contains helper modules
- Frontend: Not applicable (no tests)

## Coverage

**Requirements:**
- Backend: No coverage target specified in configuration
- Frontend: Not applicable (no tests)

**View Coverage:**
- Backend: `mix test --cover` (if coverage is desired)
- Frontend: Not applicable

## Test Types

**Unit Tests:**
- Backend: Elixir ExUnit tests focus on individual function behavior
- Frontend: Not implemented

**Integration Tests:**
- Backend: Database integration via Ecto sandbox (all tests reset database between runs)
- Frontend: Not implemented

**E2E Tests:**
- Framework: Not used
- No E2E testing infrastructure detected

## Special Considerations

**Database Testing:**
- Sandbox mode enabled: Each test runs in a transaction that rolls back
- Setup: `mix test` creates test database and runs migrations
- Helper: `test_helper.exs` configures sandbox for cleanup

**Precommit Hook:**
- Configured in `mix.exs` with `precommit` task
- Includes: `compile --warnings-as-errors`, `deps.unlock --unused`, `format`, `test`
- This ensures code quality before commits

## Current State

**Backend:**
- Basic test infrastructure in place
- Minimal test coverage: Only one test file found (`error_json_test.exs`)
- Database setup configured for testing
- Format and compilation checks in precommit

**Frontend:**
- No tests implemented
- No test framework installed or configured
- No test files created
- Ready for testing framework setup (e.g., Vitest, Jest)

## Recommended Testing Setup (Frontend)

When implementing frontend tests, consider:
- Use Vitest for consistency with Vite build tool
- React Testing Library for component testing
- Mock API calls with MSW (Mock Service Worker) or vitest mocking
- Test critical user flows and state management in Context
- Setup fixtures for API responses in mock handlers

---

*Testing analysis: 2026-02-02*
