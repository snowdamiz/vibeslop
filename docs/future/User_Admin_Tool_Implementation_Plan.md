# User Admin Tool Implementation Plan

> **Goal**: Implement a user management sub-page accessible from the Admin panel's "Users" tool. When clicked, it opens `/admin/users` showing a searchable table of all users with basic admin controls.

![Current Admin UI](/Users/sn0w/.gemini/antigravity/brain/e37ce3d1-778b-43b4-8818-8266a7c5a3b9/uploaded_image_1768994813082.png)

---

## Proposed Changes

### Backend - Accounts Context

#### [MODIFY] [accounts.ex](file:///Users/sn0w/Documents/dev/vibeslop/backend/lib/backend/accounts.ex)

Add a new function to list all users with pagination and search:

```elixir
@doc """
Lists all users with pagination and optional search.
Returns users ordered by most recent first.
"""
def list_users(opts \\ []) do
  limit = Keyword.get(opts, :limit, 50)
  offset = Keyword.get(opts, :offset, 0)
  search = Keyword.get(opts, :search)

  query = from u in User,
    order_by: [desc: u.inserted_at],
    limit: ^limit,
    offset: ^offset,
    select: u

  query = if search && search != "" do
    search_pattern = "%#{search}%"
    from u in query,
      where: ilike(u.username, ^search_pattern) or
             ilike(u.display_name, ^search_pattern) or
             ilike(u.email, ^search_pattern)
  else
    query
  end

  Repo.all(query)
end

@doc """
Counts total users, optionally filtered by search.
"""
def count_users(opts \\ []) do
  search = Keyword.get(opts, :search)

  query = from u in User, select: count(u.id)

  query = if search && search != "" do
    search_pattern = "%#{search}%"
    from u in query,
      where: ilike(u.username, ^search_pattern) or
             ilike(u.display_name, ^search_pattern) or
             ilike(u.email, ^search_pattern)
  else
    query
  end

  Repo.one(query)
end

@doc """
Toggles the verified status of a user.
"""
def toggle_verified(%User{} = user) do
  user
  |> User.changeset(%{is_verified: !user.is_verified})
  |> Repo.update()
end
```

---

### Backend - Admin Controller

#### [NEW] [admin_controller.ex](file:///Users/sn0w/Documents/dev/vibeslop/backend/lib/backend_web/controllers/admin_controller.ex)

Create a new controller for admin-only API endpoints:

```elixir
defmodule BackendWeb.AdminController do
  use BackendWeb, :controller
  alias Backend.Accounts

  plug :require_admin

  # Middleware to ensure only admins can access
  defp require_admin(conn, _opts) do
    user = conn.assigns[:current_user]
    if user && Accounts.is_admin?(user) do
      conn
    else
      conn
      |> put_status(:forbidden)
      |> json(%{error: "forbidden", message: "Admin access required"})
      |> halt()
    end
  end

  def list_users(conn, params) do
    limit = Map.get(params, "limit", "50") |> String.to_integer()
    offset = Map.get(params, "offset", "0") |> String.to_integer()
    search = Map.get(params, "search", "")

    users = Accounts.list_users(limit: limit, offset: offset, search: search)
    total = Accounts.count_users(search: search)

    json(conn, %{
      data: Enum.map(users, &user_to_admin_json/1),
      meta: %{total: total, limit: limit, offset: offset}
    })
  end

  def toggle_verified(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, updated_user} = Accounts.toggle_verified(user)
        json(conn, %{data: user_to_admin_json(updated_user)})
    end
  end

  def delete_user(conn, %{"id" => id}) do
    case Accounts.get_user(id) do
      nil ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "not_found", message: "User not found"})

      user ->
        {:ok, _} = Accounts.delete_user(user)
        send_resp(conn, :no_content, "")
    end
  end

  defp user_to_admin_json(user) do
    %{
      id: user.id,
      email: user.email,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      is_verified: user.is_verified,
      has_onboarded: user.has_onboarded,
      inserted_at: user.inserted_at,
      updated_at: user.updated_at
    }
  end
end
```

---

### Backend - Router

#### [MODIFY] [router.ex](file:///Users/sn0w/Documents/dev/vibeslop/backend/lib/backend_web/router.ex)

Add admin routes under the authenticated API scope:

```elixir
# Inside the authenticated scope
scope "/api/admin", BackendWeb do
  pipe_through [:api, :auth]

  get "/users", AdminController, :list_users
  post "/users/:id/toggle-verified", AdminController, :toggle_verified
  delete "/users/:id", AdminController, :delete_user
end
```

---

### Frontend - API Client

#### [MODIFY] [api.ts](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/lib/api.ts)

Add new types and API methods for admin user management:

```typescript
// New types
export interface AdminUser {
  id: string
  email: string
  username: string
  display_name: string
  avatar_url?: string
  is_verified: boolean
  has_onboarded: boolean
  inserted_at: string
  updated_at: string
}

export interface AdminUsersResponse {
  data: AdminUser[]
  meta: {
    total: number
    limit: number
    offset: number
  }
}

// New API methods in ApiClient class
async getAdminUsers(params?: {
  limit?: number
  offset?: number
  search?: string
}): Promise<AdminUsersResponse> {
  const queryParams = new URLSearchParams()
  if (params?.limit) queryParams.append('limit', params.limit.toString())
  if (params?.offset) queryParams.append('offset', params.offset.toString())
  if (params?.search) queryParams.append('search', params.search)
  return this.get(`/admin/users?${queryParams}`)
}

async toggleUserVerified(userId: string): Promise<{ data: AdminUser }> {
  return this.post(`/admin/users/${userId}/toggle-verified`)
}

async deleteUser(userId: string): Promise<void> {
  return this.delete(`/admin/users/${userId}`)
}
```

---

### Frontend - Routing

#### [MODIFY] [App.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/App.tsx)

Add nested route for `/admin/users`:

```tsx
import { AdminUsers } from '@/pages'

// Inside AppShell Routes
<Route path="/admin" element={<Admin />} />
<Route path="/admin/users" element={<AdminUsers />} />
```

#### [MODIFY] [index.ts](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/pages/index.ts)

Export the new AdminUsers page component.

---

### Frontend - Admin Page Update

#### [MODIFY] [Admin.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/pages/Admin.tsx)

Update the "Users" tool to navigate to `/admin/users`:

```tsx
import { useNavigate } from 'react-router-dom'

// Inside component
const navigate = useNavigate()

const tools = [
  {
    icon: Users,
    title: 'Users',
    description: 'Manage accounts',
    onClick: () => navigate('/admin/users'),
  },
  // ... existing Verified tool
]
```

---

### Frontend - Admin Users Page

#### [NEW] [AdminUsers.tsx](file:///Users/sn0w/Documents/dev/vibeslop/frontend/src/pages/AdminUsers.tsx)

Create the new user management page with:

1. **Sticky Header** - Consistent with other pages (back button, title, user count)
2. **Search Bar** - Filter users by username, display name, or email
3. **Users Table** - Paginated list showing:
   - Avatar & display name (clickable to profile)
   - Username
   - Email
   - Verified status (badge)
   - Joined date
   - Actions (toggle verified, delete)
4. **Pagination** - Load more / page navigation
5. **Confirmation Dialog** - For destructive actions (delete)

**Key UI Elements:**
- Use existing design patterns from Gigs page for table/list layout
- Match the premium aesthetic with gradients and hover effects
- Responsive design with proper mobile handling
- Loading and empty states

```tsx
// Component structure overview
export function AdminUsers() {
  // State: users, pagination, search, loading, confirmDialog
  // Effects: fetch users on mount and search/page change
  // Handlers: search, toggle verified, delete user
  
  return (
    <div className="min-h-screen">
      {/* Sticky Header with back button and title */}
      {/* Search Bar */}
      {/* Users Table/List */}
      {/* Pagination */}
      {/* Confirmation Dialog */}
    </div>
  )
}
```

---

## Verification Plan

### Manual Verification

Since this is an admin-only feature requiring authentication and database state, manual verification is most appropriate:

1. **Navigate to Admin Panel**
   - Log in as admin user
   - Click "Admin" in the left sidebar
   - Verify the Admin Control page displays with Users and Verified tools

2. **Open Users Management**
   - Click the "Users" tool card
   - Verify URL changes to `/admin/users`
   - Verify the users table loads with paginated data
   - Verify user count displays in header

3. **Search Functionality**
   - Type a username in the search bar
   - Verify the table filters to matching users
   - Clear search and verify all users return

4. **Toggle Verified Status**
   - Find a non-verified user
   - Click the "Toggle Verified" action
   - Verify the verified badge appears
   - Click again to remove verification

5. **Delete User**
   - Click delete on a test user
   - Verify confirmation dialog appears
   - Cancel and verify user remains
   - Confirm and verify user is removed from list

6. **Access Control**
   - Log out and log in as non-admin user
   - Attempt to navigate to `/admin/users`
   - Verify redirect to home page

7. **Pagination**
   - If more than 50 users exist, verify pagination controls work
   - Navigate to next page and back

---

## Implementation Order

1. Backend: Add `list_users`, `count_users`, `toggle_verified` to accounts.ex
2. Backend: Create admin_controller.ex with endpoints
3. Backend: Add routes to router.ex
4. Frontend: Add types and API methods to api.ts
5. Frontend: Update Admin.tsx with navigation
6. Frontend: Create AdminUsers.tsx page
7. Frontend: Update App.tsx routing and pages/index.ts exports
8. Test the complete flow manually
