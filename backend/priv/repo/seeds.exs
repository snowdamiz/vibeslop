# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Inside the script, you can read and write to any of your
# repositories directly:
#
#     Backend.Repo.insert!(%Backend.SomeSchema{})

alias Backend.Repo

defmodule Seeds do
  @moduledoc """
  Seed data for onvibe reference tables.
  """

  def run do
    seed_ai_tools()
    seed_tech_stacks()
    seed_specializations()
    seed_users()
    seed_projects()
    seed_posts()

    IO.puts("✅ Seeds completed!")
  end

  defp generate_uuid do
    {:ok, uuid} = Ecto.UUID.dump(Ecto.UUID.generate())
    uuid
  end

  defp seed_ai_tools do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    ai_tools = [
      %{name: "Cursor", slug: "cursor"},
      %{name: "Claude", slug: "claude"},
      %{name: "GPT-4", slug: "gpt-4"},
      %{name: "v0", slug: "v0"},
      %{name: "Bolt", slug: "bolt"},
      %{name: "GitHub Copilot", slug: "github-copilot"},
      %{name: "Replit AI", slug: "replit-ai"},
      %{name: "Midjourney", slug: "midjourney"},
      %{name: "Windsurf", slug: "windsurf"},
      %{name: "Lovable", slug: "lovable"},
      %{name: "ChatGPT", slug: "chatgpt"},
      %{name: "Gemini", slug: "gemini"},
      %{name: "Codeium", slug: "codeium"},
      %{name: "Tabnine", slug: "tabnine"},
      %{name: "Amazon Q", slug: "amazon-q"}
    ]

    entries =
      Enum.map(ai_tools, fn tool ->
        Map.merge(tool, %{id: generate_uuid(), inserted_at: now})
      end)

    Repo.insert_all("ai_tools", entries, on_conflict: :nothing, conflict_target: :slug)

    IO.puts("  Seeded #{length(ai_tools)} AI tools")
  end

  defp seed_tech_stacks do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    tech_stacks = [
      # Frontend
      %{name: "React", slug: "react", category: "frontend"},
      %{name: "Next.js", slug: "nextjs", category: "frontend"},
      %{name: "Vue", slug: "vue", category: "frontend"},
      %{name: "Svelte", slug: "svelte", category: "frontend"},
      %{name: "Astro", slug: "astro", category: "frontend"},
      %{name: "Angular", slug: "angular", category: "frontend"},
      %{name: "Solid", slug: "solid", category: "frontend"},
      %{name: "Tailwind CSS", slug: "tailwind-css", category: "frontend"},

      # Backend
      %{name: "Node.js", slug: "nodejs", category: "backend"},
      %{name: "Express", slug: "express", category: "backend"},
      %{name: "Elixir", slug: "elixir", category: "backend"},
      %{name: "Phoenix", slug: "phoenix", category: "backend"},
      %{name: "Django", slug: "django", category: "backend"},
      %{name: "FastAPI", slug: "fastapi", category: "backend"},
      %{name: "Rails", slug: "rails", category: "backend"},
      %{name: "Go", slug: "go", category: "backend"},
      %{name: "Rust", slug: "rust", category: "backend"},

      # Languages
      %{name: "TypeScript", slug: "typescript", category: "language"},
      %{name: "JavaScript", slug: "javascript", category: "language"},
      %{name: "Python", slug: "python", category: "language"},
      %{name: "Ruby", slug: "ruby", category: "language"},

      # Databases
      %{name: "PostgreSQL", slug: "postgresql", category: "database"},
      %{name: "MySQL", slug: "mysql", category: "database"},
      %{name: "MongoDB", slug: "mongodb", category: "database"},
      %{name: "Redis", slug: "redis", category: "database"},
      %{name: "SQLite", slug: "sqlite", category: "database"},
      %{name: "Supabase", slug: "supabase", category: "database"},

      # Mobile
      %{name: "React Native", slug: "react-native", category: "mobile"},
      %{name: "Flutter", slug: "flutter", category: "mobile"},
      %{name: "Swift", slug: "swift", category: "mobile"},
      %{name: "Kotlin", slug: "kotlin", category: "mobile"},

      # Other
      %{name: "Docker", slug: "docker", category: "devops"},
      %{name: "Kubernetes", slug: "kubernetes", category: "devops"},
      %{name: "AWS", slug: "aws", category: "cloud"},
      %{name: "Vercel", slug: "vercel", category: "cloud"},
      %{name: "Fly.io", slug: "fly-io", category: "cloud"}
    ]

    entries =
      Enum.map(tech_stacks, fn stack ->
        Map.merge(stack, %{id: generate_uuid(), inserted_at: now})
      end)

    Repo.insert_all("tech_stacks", entries, on_conflict: :nothing, conflict_target: :slug)

    IO.puts("  Seeded #{length(tech_stacks)} tech stacks")
  end

  defp seed_specializations do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    specializations = [
      %{name: "Frontend Development", slug: "frontend"},
      %{name: "Backend Development", slug: "backend"},
      %{name: "Full-Stack Development", slug: "full-stack"},
      %{name: "AI Integration", slug: "ai-integration"},
      %{name: "Developer Tools", slug: "developer-tools"},
      %{name: "Data Visualization", slug: "data-visualization"},
      %{name: "Mobile Development", slug: "mobile"},
      %{name: "Creative Coding", slug: "creative-coding"},
      %{name: "DevOps/Infrastructure", slug: "devops"},
      %{name: "UI/UX Design", slug: "ui-ux-design"},
      %{name: "Machine Learning", slug: "machine-learning"},
      %{name: "Web3/Blockchain", slug: "web3"},
      %{name: "Game Development", slug: "game-dev"},
      %{name: "API Development", slug: "api-development"},
      %{name: "AI Prompting", slug: "ai-prompting"}
    ]

    entries =
      Enum.map(specializations, fn spec ->
        Map.merge(spec, %{id: generate_uuid(), inserted_at: now})
      end)

    Repo.insert_all("specializations", entries, on_conflict: :nothing, conflict_target: :slug)

    IO.puts("  Seeded #{length(specializations)} specializations")
  end

  defp seed_users do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    users = [
      %{
        email: "sarah@example.com",
        username: "sarahc",
        display_name: "Sarah Chen",
        bio:
          "Full-stack developer passionate about developer tools. Building things that make developers' lives easier.",
        location: "San Francisco, CA",
        github_username: "sarahc",
        is_verified: true
      },
      %{
        email: "marcus@example.com",
        username: "marcusj",
        display_name: "Marcus Johnson",
        bio: "Building AI tools and exploring the future of coding.",
        location: "New York, NY",
        is_verified: false
      },
      %{
        email: "luna@example.com",
        username: "lunap",
        display_name: "Luna Park",
        bio: "Creative coder and AI enthusiast. Making art with algorithms.",
        location: "Los Angeles, CA",
        is_verified: true
      },
      %{
        email: "alex@example.com",
        username: "alexr",
        display_name: "Alex Rivera",
        bio: "Full-stack dev, AI tinkerer. Building products people love.",
        is_verified: false
      },
      %{
        email: "jordan@example.com",
        username: "jordanl",
        display_name: "Jordan Lee",
        bio: "Indie maker. Built 3 SaaS products with AI assistance.",
        is_verified: true
      }
    ]

    entries =
      Enum.map(users, fn user ->
        Map.merge(user, %{id: generate_uuid(), inserted_at: now, updated_at: now})
      end)

    Repo.insert_all("users", entries, on_conflict: :nothing, conflict_target: :username)

    IO.puts("  Seeded #{length(users)} users")
  end

  defp seed_projects do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Get users
    sarah = Repo.get_by!(Backend.Accounts.User, username: "sarahc")
    marcus = Repo.get_by!(Backend.Accounts.User, username: "marcusj")
    luna = Repo.get_by!(Backend.Accounts.User, username: "lunap")

    # Get tools and stacks
    cursor = Repo.get_by!(Backend.Catalog.AiTool, slug: "cursor")
    claude = Repo.get_by!(Backend.Catalog.AiTool, slug: "claude")
    gpt4 = Repo.get_by!(Backend.Catalog.AiTool, slug: "gpt-4")
    v0 = Repo.get_by!(Backend.Catalog.AiTool, slug: "v0")

    react = Repo.get_by!(Backend.Catalog.TechStack, slug: "react")
    nextjs = Repo.get_by!(Backend.Catalog.TechStack, slug: "nextjs")
    nodejs = Repo.get_by!(Backend.Catalog.TechStack, slug: "nodejs")

    # Convert user IDs to binary format
    {:ok, sarah_id} = Ecto.UUID.dump(sarah.id)
    {:ok, marcus_id} = Ecto.UUID.dump(marcus.id)
    {:ok, luna_id} = Ecto.UUID.dump(luna.id)

    projects = [
      %{
        id: generate_uuid(),
        user_id: sarah_id,
        title: "AI-Powered Code Review Dashboard",
        description:
          "A real-time dashboard that uses Claude to analyze pull requests and provide actionable feedback.",
        long_description:
          "This project started as a weekend experiment and evolved into a full-featured code review tool. The dashboard connects to your GitHub repositories and automatically analyzes every pull request using Claude.",
        status: "published",
        github_url: "https://github.com/sarahc/code-review-dashboard",
        live_url: "https://codereview.example.com",
        published_at: DateTime.add(now, -2 * 86400, :second),
        inserted_at: DateTime.add(now, -7 * 86400, :second),
        updated_at: DateTime.add(now, -2 * 86400, :second)
      },
      %{
        id: generate_uuid(),
        user_id: marcus_id,
        title: "Conversational Data Explorer",
        description:
          "Chat with your data using natural language. Built in a weekend with v0 and GPT-4.",
        long_description:
          "A tool that lets you explore your database using plain English. Just ask questions and get insights.",
        status: "published",
        github_url: "https://github.com/marcusj/data-explorer",
        published_at: DateTime.add(now, -5 * 86400, :second),
        inserted_at: DateTime.add(now, -6 * 86400, :second),
        updated_at: DateTime.add(now, -5 * 86400, :second)
      },
      %{
        id: generate_uuid(),
        user_id: luna_id,
        title: "Generative Art Studio",
        description:
          "Create stunning visuals with AI. A creative playground combining multiple AI tools.",
        long_description:
          "An interactive studio for creating AI-generated art with real-time preview and editing.",
        status: "published",
        live_url: "https://artstudio.example.com",
        published_at: DateTime.add(now, -8 * 86400, :second),
        inserted_at: DateTime.add(now, -10 * 86400, :second),
        updated_at: DateTime.add(now, -8 * 86400, :second)
      }
    ]

    Repo.insert_all("projects", projects, on_conflict: :nothing)

    # Link projects to tools and stacks
    project1 = Repo.get_by!(Backend.Content.Project, title: "AI-Powered Code Review Dashboard")
    project2 = Repo.get_by!(Backend.Content.Project, title: "Conversational Data Explorer")
    project3 = Repo.get_by!(Backend.Content.Project, title: "Generative Art Studio")

    # Convert IDs to binary
    {:ok, project1_id} = Ecto.UUID.dump(project1.id)
    {:ok, project2_id} = Ecto.UUID.dump(project2.id)
    {:ok, project3_id} = Ecto.UUID.dump(project3.id)
    {:ok, cursor_id} = Ecto.UUID.dump(cursor.id)
    {:ok, claude_id} = Ecto.UUID.dump(claude.id)
    {:ok, v0_id} = Ecto.UUID.dump(v0.id)
    {:ok, gpt4_id} = Ecto.UUID.dump(gpt4.id)
    {:ok, react_id} = Ecto.UUID.dump(react.id)
    {:ok, nextjs_id} = Ecto.UUID.dump(nextjs.id)
    {:ok, nodejs_id} = Ecto.UUID.dump(nodejs.id)

    project_tools = [
      %{project_id: project1_id, ai_tool_id: cursor_id},
      %{project_id: project1_id, ai_tool_id: claude_id},
      %{project_id: project2_id, ai_tool_id: v0_id},
      %{project_id: project2_id, ai_tool_id: gpt4_id},
      %{project_id: project3_id, ai_tool_id: claude_id}
    ]

    Repo.insert_all("project_ai_tools", project_tools,
      on_conflict: :nothing,
      conflict_target: [:project_id, :ai_tool_id]
    )

    project_stacks = [
      %{project_id: project1_id, tech_stack_id: react_id},
      %{project_id: project1_id, tech_stack_id: nodejs_id},
      %{project_id: project2_id, tech_stack_id: nextjs_id},
      %{project_id: project3_id, tech_stack_id: react_id}
    ]

    Repo.insert_all("project_tech_stacks", project_stacks,
      on_conflict: :nothing,
      conflict_target: [:project_id, :tech_stack_id]
    )

    IO.puts("  Seeded #{length(projects)} projects")
  end

  defp seed_posts do
    now = DateTime.utc_now() |> DateTime.truncate(:second)

    # Get users
    sarah = Repo.get_by!(Backend.Accounts.User, username: "sarahc")
    marcus = Repo.get_by!(Backend.Accounts.User, username: "marcusj")
    luna = Repo.get_by!(Backend.Accounts.User, username: "lunap")
    alex = Repo.get_by!(Backend.Accounts.User, username: "alexr")

    # Convert user IDs to binary format
    {:ok, sarah_id} = Ecto.UUID.dump(sarah.id)
    {:ok, marcus_id} = Ecto.UUID.dump(marcus.id)
    {:ok, luna_id} = Ecto.UUID.dump(luna.id)
    {:ok, alex_id} = Ecto.UUID.dump(alex.id)

    posts = [
      %{
        id: generate_uuid(),
        user_id: sarah_id,
        content:
          "Just discovered you can use Claude to refactor entire modules at once. Game changer for legacy codebases! The key is giving it enough context about your patterns.",
        inserted_at: DateTime.add(now, -2 * 3600, :second),
        updated_at: DateTime.add(now, -2 * 3600, :second)
      },
      %{
        id: generate_uuid(),
        user_id: marcus_id,
        content:
          "Hot take: vibe coding isn't about replacing developers, it's about amplifying what we can build. I shipped more this month than the entire Q1 last year.",
        inserted_at: DateTime.add(now, -3 * 3600, :second),
        updated_at: DateTime.add(now, -3 * 3600, :second)
      },
      %{
        id: generate_uuid(),
        user_id: luna_id,
        content:
          "Pro tip: When using Cursor, keep your project structure flat at first. Let the AI help you refactor into modules once patterns emerge. Fighting the AI early leads to frustration.",
        inserted_at: DateTime.add(now, -6 * 3600, :second),
        updated_at: DateTime.add(now, -6 * 3600, :second)
      },
      %{
        id: generate_uuid(),
        user_id: alex_id,
        content:
          "Anyone else finding that Claude 3.5 Sonnet handles React better than GPT-4? Curious what your experiences have been. Thinking of switching my whole workflow.",
        inserted_at: DateTime.add(now, -10 * 3600, :second),
        updated_at: DateTime.add(now, -10 * 3600, :second)
      }
    ]

    Repo.insert_all("posts", posts, on_conflict: :nothing)

    IO.puts("  Seeded #{length(posts)} posts")
  end
end

Seeds.run()
