# GitHub OAuth Fixes Applied

## Issues Fixed

### 1. Backend Error: "a response was neither set nor sent"
**Problem**: Ueberauth requires session support, but we were using the `:api` pipeline which doesn't have sessions.

**Solution**: Created a separate `:auth` pipeline with session support for OAuth routes:
```elixir
pipeline :auth do
  plug :accepts, ["html", "json"]
  plug :fetch_session
  plug :fetch_flash
  plug :protect_from_forgery
  plug :put_secure_browser_headers
  plug Corsica, origins: "*", allow_headers: :all, allow_methods: :all
end
```

### 2. Environment Variables Not Loading
**Problem**: Phoenix doesn't automatically load `.env` files.

**Solution**: Added manual `.env` loading in `config/runtime.exs` for development:
- Reads `.env` file
- Parses key-value pairs
- Sets them as environment variables
- Only runs in development mode

### 3. App Still Showing Mock User
**Problem**: Old mock user data persisted in localStorage.

**Solution**: 
- Added cleanup of old `vibeslop_user` localStorage item in AuthContext
- Added loading state to App.tsx to prevent showing stale data
- App now waits for auth check to complete before rendering

## How to Test

### 1. Clear Your Browser
Open your browser's Developer Tools (F12):
```javascript
// Run in browser console:
localStorage.clear()
```

### 2. Restart the Backend
```bash
cd backend
mix phx.server
```

The `.env` file will be automatically loaded on startup.

### 3. Restart the Frontend
```bash
cd frontend
npm run dev
```

### 4. Test the OAuth Flow

1. Visit http://localhost:5173
2. You should see the landing page (NOT logged in)
3. Click "Sign In"
4. Click "Continue with GitHub"
5. You'll be redirected to: `http://localhost:5173/api/auth/github`
6. Then to GitHub's authorization page
7. Authorize the app (if first time)
8. You'll be redirected back with a token
9. The app will fetch your GitHub profile and log you in
10. Your actual GitHub username/avatar should appear in the header

### 5. Verify Authentication Persistence

1. Refresh the page (F5)
2. You should stay logged in (token persists in localStorage)
3. Open DevTools → Application → Local Storage
4. You should see `vibeslop_token` with a JWT token

### 6. Test Logout

1. Click your profile menu → Logout
2. Token should be cleared
3. You should see the landing page again

## Troubleshooting

### If you still see "Demo User"
1. Clear localStorage manually: `localStorage.clear()` in console
2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
3. Check that backend is running and shows: `[info] Running BackendWeb.Endpoint`

### If OAuth redirect fails
1. Verify your GitHub OAuth App callback URL is exactly: `http://localhost:4001/api/auth/github/callback`
2. Check backend logs for errors
3. Verify `.env` file has correct credentials

### If "connection refused" error
1. Make sure PostgreSQL is running: `docker-compose up -d`
2. Wait 3 seconds for it to start
3. Restart backend

## What Changed

### Backend Files
- `backend/lib/backend_web/router.ex` - Added `:auth` pipeline
- `backend/config/runtime.exs` - Added `.env` loading
- `backend/mix.exs` - Added dotenvy dependency

### Frontend Files
- `frontend/src/context/AuthContext.tsx` - Added localStorage cleanup
- `frontend/src/App.tsx` - Added loading state check

## Next Steps

Once OAuth is working:
1. Test creating a project
2. Test posting 
3. Test following other users
4. Test messaging (when implemented)

All the infrastructure is in place - you just need to clear old cache and restart!
