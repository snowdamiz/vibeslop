# GitHub OAuth Authentication Implementation

## Overview

GitHub OAuth authentication has been successfully implemented for Vibeslop. Users can now sign in using their GitHub accounts, and the authentication state is managed using JWT tokens.

## Architecture

### Backend (Elixir/Phoenix)

#### Dependencies Added
- `ueberauth` - OAuth framework
- `ueberauth_github` - GitHub OAuth strategy
- `joken` - JWT token generation and verification
- `corsica` - CORS support for frontend-backend communication

#### Key Components

1. **Ecto Schemas**
   - `Backend.Accounts.User` - User model with profile data
   - `Backend.Accounts.OAuthAccount` - OAuth provider accounts linked to users

2. **Context Module**
   - `Backend.Accounts` - Business logic for user management
   - `find_or_create_from_github/1` - Creates user from GitHub OAuth data

3. **Authentication Module**
   - `Backend.Auth.Token` - JWT token signing and verification
   - 7-day token expiration by default

4. **Controller**
   - `BackendWeb.AuthController` - Handles OAuth flow
     - `request/2` - Initiates GitHub OAuth
     - `callback/2` - Handles callback, creates/finds user, returns JWT
     - `me/2` - Returns current authenticated user
     - `logout/2` - Logout endpoint

5. **Auth Plug**
   - `BackendWeb.Plugs.Auth` - Extracts and verifies JWT from Authorization header
   - Loads current user into conn.assigns

6. **Router**
   - Public routes: `/api/auth/:provider` and `/api/auth/:provider/callback`
   - Protected routes: `/api/me` (requires authentication)
   - CORS enabled for all API routes

### Frontend (React/TypeScript)

#### Key Components

1. **API Client** (`src/lib/api.ts`)
   - Centralized API communication
   - Automatic JWT token injection in Authorization header
   - Token storage in localStorage
   - Type-safe API methods

2. **Auth Context** (`src/context/AuthContext.tsx`)
   - Manages authentication state
   - Provides `login()`, `logout()`, `handleAuthCallback()`
   - Automatically fetches user on app load if token exists
   - Transforms API user data to frontend format

3. **Auth Callback Page** (`src/pages/AuthCallback.tsx`)
   - Handles OAuth redirect from backend
   - Extracts token from URL
   - Stores token and fetches user data
   - Redirects to home page

4. **Vite Configuration**
   - API proxy configured to forward `/api` requests to `http://localhost:4001`
   - Enables seamless development without CORS issues

## Configuration

### Backend Configuration

**Development** (backend/config/dev.exs):
```elixir
config :backend, :jwt_secret, "dev_jwt_secret_key_change_in_production"
config :backend, :frontend_url, "http://localhost:5173"
```

**Production** (backend/config/runtime.exs):
Environment variables required:
- `GITHUB_CLIENT_ID` - GitHub OAuth App Client ID
- `GITHUB_CLIENT_SECRET` - GitHub OAuth App Client Secret
- `JWT_SECRET` - Secret for signing JWT tokens (generate with `mix phx.gen.secret`)
- `FRONTEND_URL` - Frontend URL for OAuth redirects

### GitHub OAuth App Setup

1. Create OAuth App at https://github.com/settings/developers
2. Set callback URL: `http://localhost:4001/api/auth/github/callback`
3. Set homepage URL: `http://localhost:5173`
4. Copy Client ID and Client Secret to backend `.env` file

## Authentication Flow

```
1. User clicks "Sign in with GitHub" button
2. Frontend redirects to: /api/auth/github
3. Backend redirects to GitHub OAuth authorization
4. User authorizes on GitHub
5. GitHub redirects to: /api/auth/github/callback?code=xxx
6. Backend exchanges code for access token
7. Backend fetches user info from GitHub
8. Backend creates/finds user in database
9. Backend creates OAuth account record
10. Backend generates JWT token
11. Backend redirects to: http://localhost:5173/auth/callback?token=xxx
12. Frontend extracts token and stores in localStorage
13. Frontend fetches user data from /api/me
14. Frontend updates auth context and redirects to home
```

## API Endpoints

### Public Endpoints

- `GET /api/auth/github` - Initiate GitHub OAuth
- `GET /api/auth/github/callback` - OAuth callback handler
- `POST /api/auth/logout` - Logout (clears session)

### Protected Endpoints (Require JWT)

- `GET /api/me` - Get current authenticated user

## User Data Mapping

GitHub user data is mapped to Vibeslop user model:

| GitHub Field | Vibeslop Field |
|--------------|----------------|
| id | provider_user_id |
| email | email |
| login | github_username, username (base) |
| name | display_name |
| bio | bio |
| location | location |
| avatar_url | avatar_url |

If username conflicts exist, a random number suffix is added.

## Security Features

1. **JWT Tokens**
   - 7-day expiration
   - HS256 signing algorithm
   - Includes user_id and issuer claims

2. **CORS Protection**
   - Configured to allow all origins in development
   - Should be restricted in production

3. **Auth Middleware**
   - Validates JWT on protected routes
   - Returns 401 for invalid/missing tokens
   - Loads user into request context

4. **Token Storage**
   - Stored in localStorage as `vibeslop_token`
   - Automatically included in API requests
   - Cleared on logout

## Testing the Implementation

### Prerequisites
1. Start PostgreSQL: `docker-compose up -d`
2. Set up GitHub OAuth App credentials in `backend/.env`
3. Start backend: `cd backend && mix phx.server`
4. Start frontend: `cd frontend && npm run dev`

### Test Flow
1. Visit http://localhost:5173
2. Click "Sign In" or "Continue with GitHub"
3. Authorize on GitHub (if first time)
4. Should redirect back and be logged in
5. User profile should show in header
6. Verify token in browser localStorage
7. Refresh page - should stay logged in
8. Test logout functionality

## Future Enhancements

- [ ] Add Google OAuth provider
- [ ] Implement refresh tokens for long-lived sessions
- [ ] Add password-based authentication as fallback
- [ ] Implement "Remember me" checkbox
- [ ] Add email verification flow
- [ ] Token blacklisting for logout
- [ ] Session management (view active sessions, revoke)
- [ ] Two-factor authentication

## Troubleshooting

### "Connection refused" error
- Ensure PostgreSQL is running: `docker-compose up -d`
- Check database configuration in `backend/config/dev.exs`

### "authentication_failed" error
- Verify GitHub OAuth credentials are set
- Check callback URL matches GitHub OAuth App settings
- Ensure backend is running on port 4001

### Frontend shows "Loading..." forever
- Check browser console for errors
- Verify backend is running and accessible
- Check `/api/me` endpoint returns user data
- Verify JWT token is present in localStorage

### CORS errors
- Ensure Corsica is properly configured in router
- Check frontend proxy configuration in vite.config.ts
- Verify API requests use `/api` prefix

## Files Changed/Created

### Backend
- `backend/mix.exs` - Added dependencies
- `backend/lib/backend/accounts/user.ex` - User schema
- `backend/lib/backend/accounts/oauth_account.ex` - OAuth account schema
- `backend/lib/backend/accounts.ex` - Accounts context
- `backend/lib/backend/auth/token.ex` - JWT token module
- `backend/lib/backend_web/controllers/auth_controller.ex` - Auth controller
- `backend/lib/backend_web/plugs/auth.ex` - Auth plug
- `backend/lib/backend_web/router.ex` - Updated routes
- `backend/config/config.exs` - Added Ueberauth config
- `backend/config/runtime.exs` - Added environment variables
- `backend/config/dev.exs` - Added development config

### Frontend
- `frontend/src/lib/api.ts` - API client
- `frontend/src/context/AuthContext.tsx` - Updated with real API
- `frontend/src/pages/AuthCallback.tsx` - OAuth callback page
- `frontend/src/pages/index.ts` - Exported AuthCallback
- `frontend/src/App.tsx` - Added callback route
- `frontend/vite.config.ts` - Added API proxy

### Documentation
- `README.md` - Added GitHub OAuth setup instructions
- `docs/GITHUB_AUTH_IMPLEMENTATION.md` - This file

## Conclusion

GitHub OAuth authentication is now fully functional in Vibeslop. Users can sign in with their GitHub accounts, and the system maintains authenticated sessions using JWT tokens. The implementation follows security best practices and provides a seamless user experience.
