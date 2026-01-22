# Admin Controls Implementation Plan

> **Status:** Future Implementation  
> **Priority:** Medium  
> **Complexity:** Medium  

---

## Overview

This document outlines a comprehensive implementation plan for adding **Admin Controls** to the application. The admin system will allow designated administrators (identified by email) to access a protected admin panel for platform management.

### Key Requirements

1. Add a new "Admin" link and route in the left sidebar navigation
2. Restrict access to admin pages based on a configurable `ADMIN_EMAIL` environment variable
3. Only users whose authenticated email matches `ADMIN_EMAIL` can view the admin page

---

## Architecture Design

### Authentication Strategy

The admin authorization will be **email-based**, comparing the authenticated user's email against the `ADMIN_EMAIL` environment variable. This approach is simple, secure, and easy to configure without database changes.

```
┌─────────────────────────────────────────────────────────────────┐
│  User Request → Auth Check → Admin Email Check → Page Access   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  ADMIN_EMAIL env variable     │
              │  (Backend config/runtime.exs) │
              └───────────────────────────────┘
```

### Data Flow

1. **Backend:** Loads `ADMIN_EMAIL` from environment and exposes it via API
2. **Frontend:** Receives admin status as part of user data from `/api/current_user`
3. **UI:** Conditionally renders Admin link and protects Admin route

---

## Proposed Changes

### Backend Changes

---

#### [MODIFY] [runtime.exs](file:///Users/sn0w/Documents/dev/vibeslop/backend/config/runtime.exs)

Add `ADMIN_EMAIL` configuration:

```elixir
# Configure Admin Email
if admin_email = System.get_env("ADMIN_EMAIL") do
  config :backend, :admin_email, admin_email
end
```

---

#### [MODIFY] [accounts.ex](file:///Users/sn0w/Documents/dev/vibeslop/backend/lib/backend/accounts.ex) or user controller

Add helper function to check admin status:

```elixir
def is_admin?(user) do
  admin_email = Application.get_env(:backend, :admin_email)
  admin_email && user.email == admin_email
end
```

---

#### [MODIFY] User JSON serialization (likely in `user_json.ex`)

Add `is_admin` boolean field to user response:

```elixir
def data(user) do
  %{
    # ... existing fields ...
    is_admin: is_admin?(user)
  }
end
```

---

### Frontend Changes

---

#### [MODIFY] [api.ts](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/lib/api.ts)

Update `User` type to include admin field:

```typescript
export interface User {
  // ... existing fields ...
  is_admin: boolean
}
```

---

#### [MODIFY] [AuthContext.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/context/AuthContext.tsx)

1. Add `is_admin` to User interface
2. Pass through in `transformApiUser` function

```typescript
interface User {
  // ... existing fields ...
  is_admin: boolean
}

function transformApiUser(apiUser: ApiUser): User {
  return {
    // ... existing mappings ...
    is_admin: apiUser.is_admin ?? false,
  }
}
```

---

#### [NEW] [Admin.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/pages/Admin.tsx)

Create the Admin page component:

```typescript
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'
import { Shield, Users, Activity, Settings } from 'lucide-react'

export function Admin() {
  const { user, isAuthenticated } = useAuth()

  // Redirect non-admins
  if (!isAuthenticated || !user?.is_admin) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="max-w-[600px] mx-auto px-4 py-6">
      <header className="mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">Admin Panel</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Platform administration and management
        </p>
      </header>

      {/* Admin sections to be implemented */}
      <div className="space-y-4">
        {/* Placeholder cards for future admin features */}
      </div>
    </div>
  )
}
```

---

#### [MODIFY] [index.ts](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/pages/index.ts)

Export the Admin page:

```typescript
export { Admin } from './Admin'
```

---

#### [MODIFY] [App.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/App.tsx)

Add Admin route:

```typescript
import { Admin } from '@/pages'

// In Routes:
<Route path="/admin" element={<Admin />} />
```

---

#### [MODIFY] [LeftSidebar.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/components/layout/LeftSidebar.tsx)

1. Import `Shield` icon from lucide-react
2. Conditionally render Admin link when `user?.is_admin` is true

**Key changes:**

```typescript
import { Shield } from 'lucide-react'

// In the navigation section, after Profile link and before Post button:
{user?.is_admin && (
  <Link
    to="/admin"
    className={cn(
      'group flex items-center justify-center xl:justify-start gap-4',
      'w-11 h-11 xl:w-full xl:h-auto xl:px-3 xl:py-3',
      'rounded-full xl:rounded-xl flex-shrink-0',
      location.pathname === '/admin'
        ? 'bg-primary/10 text-foreground'
        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
    )}
  >
    <div className="flex items-center justify-center w-6 h-6">
      <Shield
        className={cn(
          'w-[22px] h-[22px]',
          location.pathname === '/admin' && 'text-primary'
        )}
        strokeWidth={location.pathname === '/admin' ? 2.5 : 2}
      />
    </div>
    <span className={cn(
      'text-[15px] hidden xl:block',
      location.pathname === '/admin' ? 'font-semibold' : 'font-medium'
    )}>
      Admin
    </span>
  </Link>
)}
```

---

### Environment Configuration

---

#### [MODIFY] `.env` files (development/production)

Add the `ADMIN_EMAIL` variable:

```bash
# Admin Configuration
# Email address of the platform administrator
ADMIN_EMAIL=admin@example.com
```

**Notes:**
- Multiple admins could be supported later by comma-separating emails
- For now, single admin is sufficient per requirements

---

## Security Considerations

### Frontend Protection (Defense in Depth)

1. **Route Guard:** Admin component redirects non-admins to home
2. **UI Hiding:** Admin link only shows if `user.is_admin` is true
3. **API Protection:** Backend validates admin status on sensitive endpoints

### Backend Protection (Primary Security Layer)

1. **Controller Guards:** Admin-only endpoints should check `is_admin?/1`
2. **Environment Security:** `ADMIN_EMAIL` should be kept secret in production
3. **Token Validation:** Existing JWT auth ensures user identity

### Example Backend Guard Plug

```elixir
defmodule BackendWeb.Plugs.RequireAdmin do
  import Plug.Conn
  import Phoenix.Controller

  def init(opts), do: opts

  def call(conn, _opts) do
    user = conn.assigns[:current_user]
    
    if user && Backend.Accounts.is_admin?(user) do
      conn
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "Admin access required"})
      |> halt()
    end
  end
end
```

---

## Implementation Order

1. **Phase 1: Backend** (~30 min)
   - [ ] Add `ADMIN_EMAIL` to `runtime.exs`
   - [ ] Create `is_admin?/1` helper function in Accounts
   - [ ] Add `is_admin` field to user JSON serialization
   - [ ] Add `.env` variable

2. **Phase 2: Frontend** (~45 min)
   - [ ] Update API types with `is_admin` field
   - [ ] Update AuthContext User interface
   - [ ] Create Admin.tsx page component
   - [ ] Export Admin from pages/index.ts
   - [ ] Add Admin route to App.tsx
   - [ ] Add conditional Admin link to LeftSidebar.tsx

3. **Phase 3: Testing** (~15 min)
   - [ ] Test with admin email - link visible, page accessible
   - [ ] Test with non-admin email - link hidden, redirect on direct visit
   - [ ] Test unauthenticated - no access

---

## Future Admin Features

Once the admin infrastructure is in place, consider adding:

- **User Management:** View/ban/verify users
- **Content Moderation:** Review flagged posts/projects
- **Platform Statistics:** User counts, engagement metrics
- **System Health:** Database stats, error logs
- **Feature Flags:** Enable/disable features platform-wide
- **Announcements:** Platform-wide notifications

---

## Verification Plan

### Manual Testing Steps

1. **Set up `ADMIN_EMAIL`** in backend `.env` file
2. **Log in with admin email** and verify:
   - Admin link appears in left sidebar
   - Admin page is accessible at `/admin`
3. **Log in with non-admin email** and verify:
   - Admin link is NOT visible in sidebar
   - Direct navigation to `/admin` redirects to home
4. **Log out** and verify:
   - No admin link visible
   - Direct navigation to `/admin` redirects appropriately

---

## Dependencies

- No new packages required
- Uses existing authentication infrastructure
- Uses existing UI component patterns

---

## Rollback Plan

If issues arise, simply:
1. Remove the `ADMIN_EMAIL` env variable
2. User serialization returns `is_admin: false`
3. Admin link and route become inaccessible
