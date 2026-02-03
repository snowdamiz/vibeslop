# Deployment Guide

This guide covers deploying the application to Fly.io with separate frontend and backend apps.

## Architecture

- **Frontend** (`onvibe-web`): Static React/Vite app served via nginx
- **Backend** (`onvibe-api`): Phoenix/Elixir API server
- **Database**: Fly.io Managed PostgreSQL (linked via Fly.io UI)

## Prerequisites

1. [Fly.io CLI](https://fly.io/docs/hands-on/install-flyctl/) installed
2. Fly.io account authenticated: `flyctl auth login`
3. GitHub repository with Actions enabled

## Initial Setup

### 1. Create Fly.io Apps

```bash
# Create backend app
cd backend
flyctl apps create onvibe-api --org personal

# Create frontend app
cd ../frontend
flyctl apps create onvibe-web --org personal
```

### 2. Create Managed PostgreSQL Database

Via Fly.io Dashboard:
1. Go to https://fly.io/dashboard
2. Click "Postgres" in the sidebar
3. Click "Create Postgres Cluster"
4. Choose your region (match `sjc` or update fly.toml files)
5. Select appropriate plan
6. Name it `onvibe-db`

Or via CLI:
```bash
flyctl postgres create --name onvibe-db --region sjc
```

### 3. Attach Database to Backend

```bash
flyctl postgres attach onvibe-db --app onvibe-api
```

This automatically sets the `DATABASE_URL` secret on the backend app.

### 4. Set Backend Secrets

```bash
cd backend

# Required secrets
flyctl secrets set SECRET_KEY_BASE=$(mix phx.gen.secret)
flyctl secrets set JWT_SECRET=$(openssl rand -base64 32)

# GitHub OAuth
flyctl secrets set GITHUB_CLIENT_ID=your_github_client_id
flyctl secrets set GITHUB_CLIENT_SECRET=your_github_client_secret

# Frontend URL (for CORS and OAuth redirects)
flyctl secrets set FRONTEND_URL=https://onvibe-web.fly.dev

# Stripe (if using billing)
flyctl secrets set STRIPE_SECRET_KEY=sk_live_xxx
flyctl secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
flyctl secrets set STRIPE_PREMIUM_PRICE_ID=price_xxx

# OpenRouter AI (if using AI features)
flyctl secrets set OPENROUTER_API_KEY=sk-or-xxx

# Admin email
flyctl secrets set ADMIN_EMAIL=admin@example.com
```

### 5. Update GitHub OAuth App

Update your GitHub OAuth app settings:
- **Homepage URL**: `https://onvibe-web.fly.dev`
- **Authorization callback URL**: `https://onvibe-api.fly.dev/auth/github/callback`

## GitHub Actions CI/CD

### 1. Get Fly.io Deploy Token

```bash
flyctl tokens create deploy --name github-actions
```

Copy the token (starts with `FlyV1 ...`)

### 2. Add Secret to GitHub

1. Go to your GitHub repository
2. Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `FLY_DEPLOY`
5. Value: Paste the Fly.io token

### 3. Deploy

Push to the `release` branch to trigger deployment:

```bash
git checkout -b release
git push origin release
```

Or merge into release:
```bash
git checkout release
git merge main
git push origin release
```

## Manual Deployment

If you need to deploy manually:

```bash
# Deploy backend
cd backend
flyctl deploy --remote-only

# Deploy frontend
cd frontend
flyctl deploy --remote-only
```

## Monitoring

```bash
# View backend logs
flyctl logs --app onvibe-api

# View frontend logs
flyctl logs --app onvibe-web

# SSH into backend
flyctl ssh console --app onvibe-api

# Run migrations manually
flyctl ssh console --app onvibe-api -C "/app/bin/migrate"

# Open Phoenix remote console
flyctl ssh console --app onvibe-api -C "/app/bin/backend remote"
```

## Scaling

```bash
# Scale backend (adjust memory/CPU)
flyctl scale vm shared-cpu-2x --memory 1024 --app onvibe-api

# Add more backend machines
flyctl scale count 2 --app onvibe-api

# Scale frontend
flyctl scale vm shared-cpu-1x --memory 256 --app onvibe-web
```

## Custom Domain Setup

```bash
# Add custom domain to frontend
flyctl certs create yourdomain.com --app onvibe-web

# Add custom domain to backend API
flyctl certs create api.yourdomain.com --app onvibe-api
```

Then update:
1. DNS records as instructed by Fly.io
2. `PHX_HOST` secret on backend: `flyctl secrets set PHX_HOST=api.yourdomain.com --app onvibe-api`
3. `FRONTEND_URL` secret: `flyctl secrets set FRONTEND_URL=https://yourdomain.com --app onvibe-api`
4. Frontend `fly.toml` build arg `VITE_API_URL` to `https://api.yourdomain.com`
5. GitHub OAuth app callback URLs

## Troubleshooting

### Database Connection Issues
```bash
# Check database status
flyctl postgres list

# Check connection from backend
flyctl ssh console --app onvibe-api -C "/app/bin/backend eval 'Backend.Repo.query!(\"SELECT 1\")'"
```

### Deployment Failures
```bash
# Check build logs
flyctl logs --app onvibe-api

# Verify secrets are set
flyctl secrets list --app onvibe-api
```

### Migration Failures
```bash
# Run migrations manually with verbose output
flyctl ssh console --app onvibe-api
/app/bin/backend eval "Backend.Release.migrate()"
```
