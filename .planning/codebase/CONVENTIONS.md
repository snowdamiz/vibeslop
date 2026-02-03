# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `Button.tsx`, `UserProfile.tsx`)
- Utilities and hooks: camelCase (e.g., `useDebounce.ts`, `api.ts`, `utils.ts`)
- UI components from shadcn/ui: kebab-case (e.g., `button.tsx`, `dropdown-menu.tsx`)
- Context files: PascalCase with Context suffix (e.g., `AuthContext.tsx`, `ThemeContext.tsx`)
- Elixir modules: PascalCase with Module naming (e.g., `BackendWeb.UserController`, `Backend.Gigs`)
- Elixir functions: snake_case (e.g., `get_user_by_username`, `list_gigs`)

**Functions:**
- React components and hooks: PascalCase for components (e.g., `ProfileSettings`, `useAuth`)
- Custom hooks: camelCase with `use` prefix (e.g., `useAuth`, `useDebounce`, `useSEO`)
- Utility functions: camelCase (e.g., `transformApiUser`, `cn`)
- Internal helper functions: camelCase (e.g., `applyTheme`, `getSystemTheme`)
- Elixir functions: snake_case (e.g., `list_gigs`, `get_token`, `set_token`)

**Variables:**
- State variables: camelCase (e.g., `isOpen`, `isAuthenticated`, `displayName`)
- Constants: UPPER_SNAKE_CASE for constants (e.g., `STORAGE_KEY`, `API_BASE_URL`, `SETTINGS_TABS`)
- React component props: camelCase (e.g., `className`, `isOpen`, `onOpenAvatarDialog`)

**Types:**
- Interface names: PascalCase (e.g., `User`, `AuthContextType`, `ProfileSettingsProps`)
- Generic type parameters: Single uppercase letters or PascalCase (e.g., `T`, `ReactNode`)
- Elixir module attributes: lowercase (e.g., `@moduledoc`)

## Code Style

**Formatting:**
- Prettier (implicit from tooling) with ESLint
- Line length: Not explicitly configured but matches typical Prettier defaults
- Indentation: 2 spaces (JavaScript/TypeScript), 4 spaces (Elixir default)
- Quotes: Single quotes in JavaScript/TypeScript (e.g., `import { Button } from '@/components/ui/button'`)

**Linting:**
- ESLint with flat config: `eslint.config.js`
- TypeScript strict mode enabled: `tsconfig.app.json` with `"strict": true`
- Rules:
  - `noUnusedLocals: true` - no unused variables
  - `noUnusedParameters: true` - no unused parameters
  - `noFallthroughCasesInSwitch: true` - switch cases must have break or return
  - `react-refresh/only-export-components` - allow shadcn UI components to export utilities (disabled for `src/components/ui/**/*.{ts,tsx}`)
  - `react-hooks/rules-of-hooks` - enforces React hooks rules
- Elixir: Format checked with `mix format` as part of precommit task

## Import Organization

**Order:**
1. External packages (React, routing, UI libraries)
2. Context and hooks from `@/context` and `@/hooks`
3. API and utility imports from `@/lib`
4. Component imports from `@/components`
5. Type imports (using `type` keyword)
6. CSS/asset imports

**Example from `App.tsx`:**
```typescript
import { Routes, Route, useLocation } from 'react-router-dom'
import { Header, Footer, AppShell } from '@/components/layout'
import { Landing, Home, ProjectDetail, ... } from '@/pages'
import { useAuth } from '@/context/AuthContext'
```

**Path Aliases:**
- `@/*` → `./src/*` (configured in both `tsconfig.json` and `eslint.config.js`)
- Used consistently throughout the codebase for imports

## Error Handling

**Patterns:**
- Try-catch with explicit error logging to console
- Context providers throw errors when used outside their provider (e.g., `useAuth` throws "useAuth must be used within an AuthProvider")
- API client uses Error objects with descriptive messages: `throw new Error(error.message || 'API error: ${response.status}')`
- Promise chains use `.catch()` for error handling with console.error logging
- Elixir controllers use pattern matching for error cases and `action_fallback` controller

**Example from `AuthContext.tsx`:**
```typescript
const handleAuthCallback = useCallback(async (token: string) => {
  try {
    const apiUser = await api.getCurrentUser()
    setUser(transformApiUser(apiUser))
  } catch (error) {
    console.error('Failed to fetch user after auth:', error)
    api.clearToken()
    throw error
  }
}, [])
```

## Logging

**Framework:** `console.error`, `console.log` for browser console logging

**Patterns:**
- Error logging on API failures: `console.error('Failed to fetch user:', error)`
- Status logging during auth flow: `console.error('Failed to fetch user after auth:', error)`
- No structured logging framework configured
- Elixir uses default Logger module

## Comments

**When to Comment:**
- Explain complex logic or business rules
- Note important edge cases or workarounds
- Mark sections with clear dividers for organizational clarity (e.g., `// PROFILE SETTINGS SECTION`)
- Disabled rules should have explanations: `/* eslint-disable react-refresh/only-export-components */`

**JSDoc/TSDoc:**
- Elixir module comments use `@moduledoc` and `@doc` attributes
- Example from `gigs.ex`:
```elixir
@moduledoc """
The Gigs context - handles gig marketplace functionality.
"""

@doc """
Returns a list of gigs with optional filters.
"""
```
- JavaScript/TypeScript: Block comments and inline comments, no consistent JSDoc format

## Function Design

**Size:** Functions typically 15-40 lines for React components, shorter for utilities
- Hooks stay focused on single behavior (e.g., `useDebounce` is 17 lines)
- Context providers keep setup logic in separate sections marked with comments
- Controllers in Elixir follow pattern matching and keep actions focused

**Parameters:**
- React components receive props as single object parameter (destructured in signature)
- Hooks use typed parameters with TypeScript generics where applicable
- Elixir uses keyword lists for options (e.g., `opts \\ []`)

**Return Values:**
- React components return JSX elements
- Custom hooks return state, state setters, or computed values
- API client methods return typed Promises (e.g., `Promise<User>`)
- Elixir functions return atoms for success/failure or tuples with results

## Module Design

**Exports:**
- Context modules export both Provider component and custom hook (e.g., `AuthProvider` and `useAuth`)
- UI components export the component function and sometimes variants/configuration (e.g., `Button`, `buttonVariants`)
- Utilities export named functions (e.g., `export function cn(...)`)
- Elixir modules export functions implicitly (all public functions)

**Barrel Files:**
- `src/pages/index.ts` - exports all page components
- `src/components/layout/index.ts` - exports layout components
- Pattern: `export { ComponentA, ComponentB, ... } from './path'`

## Type Safety

- TypeScript strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- Props are typed with interfaces: `interface ProfileSettingsProps { ... }`
- Context values have explicit `ContextType` interfaces
- API responses have defined interfaces (e.g., `User`, `Notification`, `Gig`)
- Generic types used appropriately (e.g., `<T>` in API client methods)

## Special Patterns

**Destructuring:**
- Props destructured in function signature: `export function Button({ className, variant = "default", ... })`
- State updates kept together in single functions where possible

**Async/Await:**
- Used consistently for API calls and async operations
- Error handling explicit with try-catch or .catch()

**Conditional Rendering:**
- Early returns for loading/error states
- Ternary operators for simple conditions
- Element existence checks before rendering (e.g., `{location.pathname === '/' && ...}`)

---

*Convention analysis: 2026-02-02*
