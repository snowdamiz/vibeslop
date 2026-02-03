# AI-Powered Project Post Generation

## Overview

This document outlines the plan for implementing an AI-powered feature that allows users to automatically generate project posts from their GitHub repositories. Users select a repository from their connected GitHub account, and AI analyzes the repository to populate all project post fields, including generating a promotional cover image.

## Background / Context

### Problem Statement

Creating detailed project posts requires significant effort:
- Writing compelling descriptions takes time
- Identifying and listing all technologies used is tedious
- Generating eye-catching cover images requires design skills
- Users may undersell their projects due to writer's block

### Solution

Automate the project post creation process by:
1. Fetching repository data from GitHub API
2. Using AI to analyze code, README, and metadata
3. Generating all project post fields automatically
4. Creating a promotional cover image
5. Allowing users to edit before publishing

### Target Users

- Developers who want to quickly showcase GitHub projects
- Users who struggle with self-promotion or writing
- Builders who want consistent, professional project presentations

## Technical Architecture

### System Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │     │   Backend       │     │   External      │
│                 │     │                 │     │                 │
│  RepoSelector   │────▶│  AIController   │────▶│  GitHub API     │
│       │         │     │       │         │     │                 │
│       ▼         │     │       ▼         │     │  OpenRouter     │
│  AIGenerator    │◀────│  OpenRouter     │────▶│  (Claude/FLUX)  │
│       │         │     │  Client         │     │                 │
│       ▼         │     │       │         │     └─────────────────┘
│  EditableForm   │     │       ▼         │
│       │         │     │  ProjectCtrl    │
│       ▼         │     │                 │
│  Submit         │────▶│  Create Project │
└─────────────────┘     └─────────────────┘
```

### Technology Choices

| Component | Technology | Rationale |
|-----------|------------|-----------|
| LLM Gateway | OpenRouter | Unified API for 400+ models, fallback support |
| Text Generation | Claude 3.5 Sonnet | Best balance of quality and cost |
| Image Generation | FLUX.2 Pro | High quality, good text rendering |
| HTTP Client | Req (Elixir) | Already in project dependencies |
| Rate Limiting | Hammer | ETS/Redis backend support |

## Implementation Plan

### Phase 1: GitHub Repository Fetching

**Objective**: Enable users to list and select their GitHub repositories.

**Backend Changes**:

1. **Expand OAuth Scope** (`backend/lib/backend_web/controllers/auth_controller.ex`)
   - Change scope from `user:email` to `user:email public_repo`
   - For private repos: `user:email repo`

2. **Store OAuth Token** (`backend/lib/backend/accounts/user.ex`)
   - Add `github_access_token` field (encrypted)
   - Store token on successful OAuth callback

3. **Create GitHub Client Module** (`backend/lib/backend/github/client.ex`)
   ```elixir
   defmodule Backend.GitHub.Client do
     @base_url "https://api.github.com"
     
     def list_user_repos(access_token, opts \\ []) do
       # GET /user/repos
     end
     
     def get_repo(access_token, owner, repo) do
       # GET /repos/{owner}/{repo}
     end
     
     def get_readme(access_token, owner, repo) do
       # GET /repos/{owner}/{repo}/readme
     end
     
     def get_languages(access_token, owner, repo) do
       # GET /repos/{owner}/{repo}/languages
     end
     
     def get_topics(access_token, owner, repo) do
       # GET /repos/{owner}/{repo}/topics
     end
   end
   ```

4. **Create API Endpoint** (`backend/lib/backend_web/controllers/github_controller.ex`)
   - `GET /api/github/repos` - List user's repositories
   - `GET /api/github/repos/:owner/:repo` - Get repository details

**Frontend Changes**:

1. Add repository selector component
2. Add API client methods for GitHub endpoints

### Phase 2: AI Text Generation

**Objective**: Generate project post content from repository data.

**Backend Changes**:

1. **Create OpenRouter Client** (`backend/lib/backend/ai/openrouter.ex`)
   ```elixir
   defmodule Backend.AI.OpenRouter do
     @base_url "https://openrouter.ai/api/v1"
     
     def chat_completion(messages, opts \\ []) do
       model = Keyword.get(opts, :model, "anthropic/claude-3.5-sonnet")
       
       Req.post!("#{@base_url}/chat/completions",
         json: %{
           model: model,
           messages: messages
         },
         headers: [
           {"Authorization", "Bearer #{api_key()}"},
           {"HTTP-Referer", frontend_url()},
           {"X-Title", "Onvibe"}
         ]
       )
     end
     
     defp api_key, do: System.get_env("OPENROUTER_API_KEY")
   end
   ```

2. **Create AI Service Module** (`backend/lib/backend/ai/project_generator.ex`)
   ```elixir
   defmodule Backend.AI.ProjectGenerator do
     def generate_from_repo(repo_data) do
       prompt = build_analysis_prompt(repo_data)
       
       messages = [
         %{role: "system", content: system_prompt()},
         %{role: "user", content: prompt}
       ]
       
       Backend.AI.OpenRouter.chat_completion(messages)
       |> parse_response()
     end
     
     defp system_prompt do
       """
       You are an expert at analyzing GitHub repositories and creating 
       compelling project showcases. Generate engaging, accurate descriptions 
       that highlight what makes each project unique and interesting.
       """
     end
   end
   ```

3. **Add Rate Limiting** (`backend/lib/backend/ai/rate_limiter.ex`)
   ```elixir
   defmodule Backend.AI.RateLimiter do
     def check_ai_generation(user_id) do
       case Hammer.check_rate("ai:#{user_id}", 60_000 * 60, 10) do
         {:allow, _count} -> :ok
         {:deny, _limit} -> {:error, :rate_limited}
       end
     end
     
     def check_image_generation(user_id) do
       case Hammer.check_rate("ai_img:#{user_id}", 60_000 * 60, 5) do
         {:allow, _count} -> :ok
         {:deny, _limit} -> {:error, :rate_limited}
       end
     end
   end
   ```

4. **Create AI Controller** (`backend/lib/backend_web/controllers/ai_controller.ex`)
   - `POST /api/ai/generate-project` - Generate project from repo
   - `POST /api/ai/generate-image` - Generate cover image

**Repository Analysis Prompt**:

```
You are analyzing a GitHub repository to create a project showcase post.

Repository: {repo_name}
Description: {repo_description}
Languages: {languages_breakdown}
Topics: {topics}
Stars: {stars_count}
README Content:
{readme_content}

Generate a JSON response with the following structure:
{
  "title": "Catchy project name (max 60 chars)",
  "description": "Compelling 2-3 sentence summary for social feed",
  "long_description": "Detailed markdown description (200-400 words)",
  "highlights": ["3-5 key features or achievements"],
  "detected_tools": ["AI tools if mentioned (Cursor, Claude, etc.)"],
  "detected_stack": ["Main technologies used"],
  "suggested_image_prompt": "Detailed prompt for generating a banner image"
}

Focus on what makes this project interesting and unique. Be enthusiastic but accurate.
```

### Phase 3: Frontend Integration

**Objective**: Build the UI for AI-powered project creation.

**New Components**:

1. **Repository Selector** (`frontend/src/components/ai/RepoSelector.tsx`)
   - Dropdown/search of user's repositories
   - Shows repo name, description, language, stars
   - Handles pagination for users with many repos

2. **AI Generation Modal** (`frontend/src/components/ai/AIProjectGenerator.tsx`)
   - Multi-step wizard flow
   - Loading states for each generation phase
   - Streaming text display for description generation

3. **Editable Preview** (`frontend/src/components/ai/GeneratedProjectPreview.tsx`)
   - Shows all generated fields
   - Inline editing for each field
   - "Regenerate" buttons for individual sections

**UX Flow**:

```
1. User clicks "Create Project with AI" button
2. Modal opens with repository selector
3. User selects repository
4. Loading: "Fetching repository details..."
5. Loading: "Analyzing project..." (with streaming text)
6. Preview appears with all fields populated
7. User can edit any field
8. Loading: "Generating cover image..."
9. Image appears (can regenerate)
10. User clicks "Create Project"
11. Standard project creation flow completes
```

**Loading States** (following AI UX best practices):

- **Analyzing**: Pulsing animation with status text
- **Generating Text**: Word-by-word streaming appearance
- **Generating Image**: Skeleton placeholder → fade-in reveal
- **Error States**: Clear error messages with retry options

### Phase 4: Image Generation

**Objective**: Generate promotional cover images for projects.

**Implementation**:

```elixir
defmodule Backend.AI.ImageGenerator do
  def generate_project_banner(project_data) do
    prompt = build_image_prompt(project_data)
    
    Req.post!("#{@base_url}/chat/completions",
      json: %{
        model: "black-forest-labs/flux.2-pro",
        messages: [%{role: "user", content: prompt}],
        modalities: ["image", "text"]
      },
      headers: [{"Authorization", "Bearer #{api_key()}"}]
    )
    |> extract_base64_image()
  end
  
  defp build_image_prompt(project_data) do
    """
    Create a modern, professional banner image for a software project.
    
    Project: #{project_data.title}
    Tech Stack: #{Enum.join(project_data.stack, ", ")}
    Theme: #{determine_theme(project_data)}
    
    Style: Clean, minimalist, tech-focused. Abstract geometric shapes 
    with gradients. No text in the image. Suitable for social media 
    sharing. 16:9 aspect ratio. Professional and modern aesthetic.
    """
  end
end
```

**Image Response Handling**:

OpenRouter returns images as base64 in the response:
```json
{
  "choices": [{
    "message": {
      "images": ["data:image/png;base64,iVBORw0KGgo..."]
    }
  }]
}
```

This format is already compatible with the existing `ProjectComposer` image handling.

## API Changes

### New Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/github/repos` | List user's GitHub repos | Required |
| GET | `/api/github/repos/:owner/:repo` | Get repo details | Required |
| POST | `/api/ai/generate-project` | Generate project from repo | Required |
| POST | `/api/ai/generate-image` | Generate cover image | Required |

### Request/Response Examples

**Generate Project Request**:
```json
POST /api/ai/generate-project
{
  "repo": {
    "owner": "username",
    "name": "repo-name"
  }
}
```

**Generate Project Response**:
```json
{
  "data": {
    "title": "My Awesome Project",
    "description": "A brief, compelling summary...",
    "long_description": "Detailed markdown description...",
    "highlights": ["Feature 1", "Feature 2", "Feature 3"],
    "tools": ["Cursor", "Claude"],
    "stack": ["TypeScript", "React", "Node.js"],
    "links": {
      "github": "https://github.com/username/repo-name",
      "live": "https://example.com"
    },
    "suggested_image_prompt": "..."
  }
}
```

## Database Changes

### New Fields

**users table**:
```sql
ALTER TABLE users ADD COLUMN github_access_token_encrypted BYTEA;
ALTER TABLE users ADD COLUMN github_token_expires_at TIMESTAMP;
```

### Migration

```elixir
defmodule Backend.Repo.Migrations.AddGithubTokenToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :github_access_token_encrypted, :binary
      add :github_token_expires_at, :utc_datetime
    end
  end
end
```

## Configuration

### Environment Variables

```bash
# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# GitHub OAuth (existing, may need scope update)
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# Rate Limiting (optional)
AI_RATE_LIMIT_HOURLY=10
AI_IMAGE_RATE_LIMIT_HOURLY=5
```

### Application Config

```elixir
# config/runtime.exs
config :backend, Backend.AI,
  openrouter_api_key: System.get_env("OPENROUTER_API_KEY"),
  default_model: "anthropic/claude-3.5-sonnet",
  image_model: "black-forest-labs/flux.2-pro",
  rate_limit_hourly: String.to_integer(System.get_env("AI_RATE_LIMIT_HOURLY") || "10")
```

## Cost Estimation

| Component | Per Generation | Monthly (1000 users, 5 gen/each) |
|-----------|----------------|----------------------------------|
| Claude 3.5 Sonnet | ~$0.01 | ~$50 |
| FLUX.2 Pro Image | ~$0.03 | ~$150 |
| GitHub API | Free | Free |
| **Total** | ~$0.04 | ~$200 |

## Security Considerations

1. **Token Storage**: Encrypt GitHub tokens at rest using `Cloak` or similar
2. **Token Exposure**: Never send tokens to frontend; proxy all GitHub requests
3. **Ownership Validation**: Verify user owns repository before AI analysis
4. **Output Sanitization**: Sanitize AI outputs before database storage
5. **Rate Limiting**: Prevent abuse with per-user limits
6. **API Key Protection**: Store OpenRouter key server-side only

## Testing Strategy

### Unit Tests

- OpenRouter client request/response handling
- GitHub client API integration
- Prompt generation logic
- Rate limiting behavior

### Integration Tests

- Full flow: repo selection → generation → preview → create
- Error handling for API failures
- Rate limit enforcement

### Manual Testing

- Various repository types (frontend, backend, full-stack)
- Edge cases (empty repos, no README, private repos)
- Image generation quality assessment

## Future Considerations

1. **Streaming Responses**: Implement SSE for real-time text generation display
2. **Caching**: Cache repository data to reduce GitHub API calls
3. **Multiple Images**: Generate multiple image options for user selection
4. **Template System**: Pre-defined prompts for different project types
5. **Re-analysis**: Allow regenerating content for existing projects
6. **Batch Generation**: Import multiple repositories at once

## References

- [OpenRouter API Documentation](https://openrouter.ai/docs/api/reference/overview)
- [OpenRouter Image Generation Guide](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)
- [GitHub REST API - Repositories](https://docs.github.com/rest/repos)
- [GitHub OAuth Scopes](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps)
- [Hammer Rate Limiting Library](https://github.com/ExHammer/hammer)
- [Cloudscape AI Loading States](https://cloudscape.design/patterns/genai/genai-loading-states/)

---

*Document created: January 20, 2026*
