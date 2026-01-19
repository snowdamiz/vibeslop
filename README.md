# Vibeslop

> The social portfolio platform for vibe coders 🎨⚡

Vibeslop is where AI-native builders showcase their work, share their process, and connect with a community that celebrates vibe coding.

## What is Vibeslop?

A social media platform specifically for the vibe coding community—developers and creators who embrace AI-assisted development. Unlike traditional portfolios that hide the "how," Vibeslop makes the AI tools, prompts, and creative process a first-class citizen.

### Core Features

- **🖼️ Project Portfolios** - Showcase your builds with screenshots, links, and descriptions
- **🤖 "Built With" Context** - Show which AI tools powered your project (Cursor, Claude, v0, etc.)
- **📈 Process Timelines** - Share your journey, iterations, and learnings
- **👥 Social Feed** - Follow builders, discover projects, engage with the community
- **🏷️ Technical Specializations** - "AI Prompting for React" is a real skill here

### Why Vibeslop?

| Problem | Vibeslop Solution |
|---------|-------------------|
| GitHub feels too "serious" for experiments | Casual, showcase-friendly environment |
| Twitter threads disappear | Permanent, searchable portfolio |
| Traditional portfolios hide AI assistance | AI tools are celebrated, not hidden |
| No community for vibe coders | Built specifically for this community |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite + React + Tailwind CSS |
| Backend | Elixir + Phoenix |
| Database | PostgreSQL |
| Real-time | Phoenix Channels |

## Getting Started

### Prerequisites

- Node.js 18+
- Elixir 1.15+
- Docker (for PostgreSQL)

### Quick Start

```bash
# Install root dependencies (concurrently)
npm install

# Install frontend and backend dependencies
npm run setup

# Start everything (frontend, backend, postgres) with one command
npm run dev
```

This will start:
- **Frontend** at http://localhost:5173
- **Backend API** at http://localhost:4001
- **PostgreSQL** on port 5433

Migrations run automatically when the backend starts in development.

### Individual Commands

```bash
# Start only the database
npm run db:start

# Start only frontend
npm run dev:frontend

# Start only backend
npm run dev:backend

# Reset database (drop, create, migrate, seed)
npm run db:reset
```

### GitHub OAuth Setup

To enable authentication, you need to create a GitHub OAuth App:

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the application details:
   - **Application name**: Vibeslop (Dev)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:4001/api/auth/github/callback`
4. Click "Register application"
5. Copy the Client ID and generate a Client Secret
6. Create a `.env` file in the `backend` directory with:

```bash
GITHUB_CLIENT_ID=your_client_id_here
GITHUB_CLIENT_SECRET=your_client_secret_here
JWT_SECRET=your_jwt_secret_here  # Generate with: mix phx.gen.secret
FRONTEND_URL=http://localhost:5173
```

Note: The backend already has development defaults for `JWT_SECRET` and `FRONTEND_URL`, but you'll need to set the GitHub OAuth credentials.

## Project Status

🚧 **In Development** - See [PROJECT_BRIEF.md](./docs/PROJECT_BRIEF.md) for full details.

## Documentation

- [Project Brief](./docs/PROJECT_BRIEF.md) - Full planning document with features, personas, roadmap

## License

TBD

---

*Built with vibes* ✨
