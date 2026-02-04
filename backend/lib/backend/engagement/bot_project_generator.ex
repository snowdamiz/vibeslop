defmodule Backend.Engagement.BotProjectGenerator do
  @moduledoc """
  Generates realistic project content for bot users using AI.

  Projects are created without external URLs (no GitHub, no live demo) since
  those would expose bots as fake accounts if users tried to visit them.
  """

  alias Backend.AI.OpenRouter

  require Logger

  @project_types [
    :cli_tool,
    :web_app,
    :api,
    :library,
    :browser_extension,
    :mobile_app,
    :automation,
    :devtool
  ]

  @doc """
  Generate project content for a bot user.

  Returns {:ok, project_attrs} or {:error, reason}
  """
  def generate_project(bot_user, opts \\ []) do
    project_type = Keyword.get(opts, :project_type, Enum.random(@project_types))

    prompt = build_prompt(bot_user, project_type)

    messages = [
      %{
        role: "system",
        content: "You are a helpful assistant that generates realistic software project content. Always respond with valid JSON only, no additional text."
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(messages, model: fast_model(), max_tokens: 1000) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, text} ->
            parse_project_response(text, bot_user)

          {:error, reason} ->
            Logger.warning("BotProjectGenerator: Failed to extract text: #{inspect(reason)}")
            {:ok, generate_fallback_project(bot_user, project_type)}
        end

      {:error, reason} ->
        Logger.warning("BotProjectGenerator: AI generation failed: #{inspect(reason)}")
        {:ok, generate_fallback_project(bot_user, project_type)}
    end
  end

  defp fast_model do
    Application.get_env(:backend, Backend.AI)[:fast_model] ||
      "x-ai/grok-4.1-fast"
  end

  defp build_prompt(bot_user, project_type) do
    persona_context = persona_description(bot_user.persona_type)
    type_context = project_type_description(project_type)

    """
    You are generating a fictional software project showcase for a developer portfolio platform.

    Developer persona: #{persona_context}
    Project type: #{type_context}

    Generate a realistic project with:
    1. A catchy but professional title (3-6 words)
    2. A short description (1-2 sentences, under 200 chars)
    3. A longer description (2-3 paragraphs explaining what it does, why it's useful, technical approach)
    4. 3-5 highlight bullet points (key features or achievements)
    5. Suggested tech stack tags (2-4 technologies)
    6. Suggested AI tools if applicable (0-2 tools)

    IMPORTANT: This is a personal/hobby project, so it does NOT have:
    - A live demo URL
    - A public GitHub repository
    - External links of any kind

    Respond in this exact JSON format:
    {
      "title": "Project Title Here",
      "description": "Short one-line description here.",
      "long_description": "Longer multi-paragraph description here...",
      "highlights": ["Feature 1", "Feature 2", "Feature 3"],
      "tech_stack": ["React", "Node.js"],
      "ai_tools": ["ChatGPT"]
    }

    Only respond with valid JSON, no other text.
    """
  end

  defp persona_description("enthusiast"), do: "Passionate builder who loves shipping side projects and experimenting with new tech"
  defp persona_description("casual"), do: "Developer who codes for fun and occasionally builds small utilities"
  defp persona_description("supportive"), do: "Community-focused developer who builds tools to help other devs"
  defp persona_description("lurker"), do: "Quiet developer who occasionally shares their work"
  defp persona_description(_), do: "Software developer with varied interests"

  defp project_type_description(:cli_tool), do: "Command-line tool or utility"
  defp project_type_description(:web_app), do: "Web application (dashboard, SaaS tool, etc.)"
  defp project_type_description(:api), do: "REST or GraphQL API service"
  defp project_type_description(:library), do: "Reusable code library or SDK"
  defp project_type_description(:browser_extension), do: "Browser extension for Chrome/Firefox"
  defp project_type_description(:mobile_app), do: "Mobile app (iOS/Android)"
  defp project_type_description(:automation), do: "Automation script or bot"
  defp project_type_description(:devtool), do: "Developer productivity tool"

  defp parse_project_response(response, bot_user) do
    # Extract JSON from response (may have markdown code blocks)
    json_str =
      response
      |> String.replace(~r/```json\s*/, "")
      |> String.replace(~r/```\s*/, "")
      |> String.trim()

    case Jason.decode(json_str) do
      {:ok, data} ->
        {:ok, %{
          title: data["title"] || "Untitled Project",
          description: data["description"] || "A software project.",
          long_description: data["long_description"] || data["description"] || "",
          highlights: data["highlights"] || [],
          tech_stack_names: data["tech_stack"] || [],
          ai_tool_names: data["ai_tools"] || [],
          user_id: bot_user.user_id,
          status: "published",
          published_at: DateTime.utc_now(),
          # Explicitly no external URLs
          github_url: nil,
          live_url: nil
        }}

      {:error, _} ->
        Logger.warning("BotProjectGenerator: Failed to parse JSON response")
        {:ok, generate_fallback_project(bot_user, :web_app)}
    end
  end

  @fallback_projects [
    %{
      title: "Task Flow Manager",
      description: "A minimal task management app with drag-and-drop kanban boards.",
      long_description: """
      Built this over a weekend to scratch my own itch - I wanted something simpler than Trello but more visual than a todo list.

      Features a clean kanban interface with drag-and-drop support, keyboard shortcuts for power users, and local storage so your data stays private. No account needed.

      Tech-wise, it's a straightforward React app with some custom hooks for the drag-and-drop logic. Kept dependencies minimal on purpose.
      """,
      highlights: ["Drag-and-drop kanban boards", "Keyboard shortcuts", "Local storage - no account needed", "Dark mode support"],
      tech_stack_names: ["React", "TypeScript", "Tailwind CSS"],
      ai_tool_names: []
    },
    %{
      title: "API Response Mocker",
      description: "CLI tool to quickly mock API responses during frontend development.",
      long_description: """
      Got tired of waiting for backend endpoints during frontend work, so I built this little CLI tool.

      Point it at an OpenAPI spec (or just define routes manually) and it spins up a mock server with realistic fake data. Supports delays to simulate network latency and can return different responses based on query params.

      Written in Go for easy distribution - just download a single binary and you're good to go.
      """,
      highlights: ["OpenAPI spec support", "Realistic fake data generation", "Configurable latency simulation", "Single binary distribution"],
      tech_stack_names: ["Go", "OpenAPI"],
      ai_tool_names: []
    },
    %{
      title: "Commit Message Helper",
      description: "VS Code extension that suggests commit messages based on staged changes.",
      long_description: """
      I always struggled with writing good commit messages, so I built this extension to help.

      It analyzes your staged changes and suggests a conventional commit message. You can accept, edit, or regenerate. Works offline using local heuristics, but can optionally use AI for better suggestions.

      Has gotten pretty good at detecting whether something is a fix, feat, refactor, or docs change based on the files modified.
      """,
      highlights: ["Analyzes staged changes", "Conventional commit format", "Works offline", "Optional AI enhancement"],
      tech_stack_names: ["TypeScript", "VS Code API"],
      ai_tool_names: ["Claude"]
    },
    %{
      title: "Color Palette Generator",
      description: "Generate accessible color palettes from a single base color.",
      long_description: """
      Designing color systems is hard, especially when you need to ensure accessibility. This tool takes one color and generates a full palette with proper contrast ratios.

      Each generated color shows its WCAG contrast ratio against white and black backgrounds. You can lock certain colors and regenerate others, or adjust the overall saturation/brightness.

      Export to CSS variables, Tailwind config, or just copy individual hex values.
      """,
      highlights: ["WCAG contrast checking", "Multiple export formats", "Lock and regenerate individual colors", "Tailwind config export"],
      tech_stack_names: ["Svelte", "TypeScript"],
      ai_tool_names: []
    },
    %{
      title: "Markdown Note Sync",
      description: "Sync markdown notes between devices using your own cloud storage.",
      long_description: """
      Wanted a simple note-taking app that didn't lock me into a proprietary format or require yet another subscription.

      This connects to your Dropbox/Google Drive/S3 and syncs plain markdown files. Has a nice editor with live preview, but the files are just markdown - open them anywhere.

      Handles conflicts gracefully and works offline, syncing when you're back online.
      """,
      highlights: ["Plain markdown files", "Multiple cloud providers", "Offline support with sync", "Conflict resolution"],
      tech_stack_names: ["React", "Electron", "TypeScript"],
      ai_tool_names: []
    },
    %{
      title: "Log Viewer Pro",
      description: "Terminal-based log viewer with filtering, highlighting, and tail support.",
      long_description: """
      Built this because I was spending too much time grep-ing through log files. It's like tail -f but with superpowers.

      Supports multiple log formats out of the box (JSON, Apache, nginx, etc.) and lets you filter by level, search with regex, and highlight patterns. Can follow multiple files simultaneously in split panes.

      Written in Rust for performance - handles huge log files without breaking a sweat.
      """,
      highlights: ["Multiple log format support", "Regex filtering and highlighting", "Multi-file split view", "Handles large files efficiently"],
      tech_stack_names: ["Rust"],
      ai_tool_names: []
    },
    %{
      title: "Schema Diff Tool",
      description: "Compare database schemas and generate migration scripts.",
      long_description: """
      Managing database migrations across environments was a pain, so I built this tool to automate the diff process.

      Point it at two databases (or schema files) and it shows you exactly what's different - added tables, modified columns, dropped indexes, etc. Then it can generate the migration SQL to sync them up.

      Supports Postgres and MySQL. The generated migrations are human-readable and safe to review before running.
      """,
      highlights: ["Visual schema comparison", "Auto-generate migrations", "Postgres and MySQL support", "Safe, reviewable output"],
      tech_stack_names: ["Python", "PostgreSQL", "MySQL"],
      ai_tool_names: []
    },
    %{
      title: "Bundle Size Tracker",
      description: "GitHub Action that tracks and reports JavaScript bundle size changes.",
      long_description: """
      Bundle size creep is real. This GitHub Action runs on every PR and comments with a detailed breakdown of how the change affects your bundle.

      Shows total size change, per-chunk breakdown, and flags any chunks that grew significantly. Configurable thresholds for warnings and failures.

      Stores historical data so you can track trends over time. Integrates with the GitHub checks API for a nice CI experience.
      """,
      highlights: ["Per-chunk size analysis", "Configurable thresholds", "Historical trend tracking", "GitHub checks integration"],
      tech_stack_names: ["TypeScript", "GitHub Actions"],
      ai_tool_names: []
    }
  ]

  defp generate_fallback_project(bot_user, _project_type) do
    project = Enum.random(@fallback_projects)

    Map.merge(project, %{
      user_id: bot_user.user_id,
      status: "published",
      published_at: DateTime.utc_now(),
      github_url: nil,
      live_url: nil
    })
  end

  @doc """
  Get a random project type.
  """
  def random_project_type, do: Enum.random(@project_types)
end
