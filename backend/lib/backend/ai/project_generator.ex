defmodule Backend.AI.ProjectGenerator do
  @moduledoc """
  Generates project post content from GitHub repository data using AI.
  """

  alias Backend.AI.OpenRouter

  @doc """
  Generates project post content from repository details.
  Returns a map with title, description, highlights, tools, stack, etc.
  """
  def generate_from_repo(repo_details) do
    prompt = build_analysis_prompt(repo_details)

    messages = [
      %{role: "system", content: system_prompt()},
      %{role: "user", content: prompt}
    ]

    case OpenRouter.chat_completion(messages, max_tokens: 2000) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, text} -> parse_response(text)
          {:error, reason} -> {:error, reason}
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  @doc """
  Generates a cover image for a project using Gemini 3 Pro Image Preview.
  Optionally accepts repo_info to search for and incorporate logos as watermarks.
  """
  def generate_image(project_data, repo_info \\ nil) do
    require Logger

    # If repo info provided, try to find logos
    reference_images = case repo_info do
      %{access_token: token, owner: owner, repo: repo} ->
        Logger.info("Attempting to find logos for #{owner}/#{repo}")
        case Backend.GitHub.Client.find_logos(token, owner, repo) do
          {:ok, [_ | _] = logos} ->
            Logger.info("Found #{length(logos)} logo(s)")
            logos
          {:ok, []} ->
            Logger.info("No logos found in repository")
            []
          {:error, reason} ->
            Logger.warning("Logo search failed: #{inspect(reason)}")
            []
        end
      _ ->
        Logger.info("No repo info provided")
        []
    end

    # Build prompt (includes logo instructions if logos were found)
    prompt = build_image_prompt(project_data, reference_images)
    Logger.info("Generating image with #{length(reference_images)} reference image(s)")

    # Single unified call - Gemini handles both cases
    OpenRouter.generate_image(prompt, reference_images: reference_images)
  end

  # Private helper functions

  defp system_prompt do
    """
    You are an expert at analyzing GitHub repositories and creating compelling project showcases for developers.

    Your task is to generate engaging, accurate descriptions that highlight what makes each project interesting and unique.
    Focus on the "why" behind the project, key features, and technical highlights.

    IMPORTANT: Respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or explanatory text.
    Your entire response must be a single JSON object that can be parsed directly.
    """
  end

  defp build_analysis_prompt(repo_details) do
    repo = repo_details.repo
    languages = repo_details.languages || %{}
    topics = repo_details.topics || []
    readme = repo_details.readme

    # Format languages as a readable string
    language_breakdown = if map_size(languages) > 0 do
      total_bytes = Enum.reduce(languages, 0, fn {_, bytes}, acc -> acc + bytes end)

      languages
      |> Enum.sort_by(fn {_, bytes} -> bytes end, :desc)
      |> Enum.take(5)
      |> Enum.map(fn {lang, bytes} ->
        percentage = Float.round(bytes / total_bytes * 100, 1)
        "#{lang} (#{percentage}%)"
      end)
      |> Enum.join(", ")
    else
      repo["language"] || "Not specified"
    end

    # Truncate README to avoid token limits
    readme_content = if readme do
      readme
      |> String.slice(0, 3000)
      |> then(fn content ->
        if String.length(readme) > 3000 do
          content <> "\n\n[README truncated for length]"
        else
          content
        end
      end)
    else
      "No README available"
    end

    """
    Analyze this GitHub repository and create a project showcase post.

    Repository: #{repo["full_name"]}
    Description: #{repo["description"] || "No description"}
    Homepage: #{repo["homepage"] || "None"}
    Stars: #{repo["stargazers_count"]}
    Forks: #{repo["forks_count"]}
    Languages: #{language_breakdown}
    Topics: #{Enum.join(topics, ", ")}

    README Content:
    #{readme_content}

    Generate a JSON response with this exact structure:
    {
      "title": "Catchy project name (max 60 chars, use the actual repo name or make it more appealing)",
      "description": "Compelling 2-3 sentence summary for social feed (150-250 chars). Focus on WHAT the project does, not HOW it's built.",
      "long_description": "MUST follow the exact markdown format specified below",
      "highlights": ["3-5 key features or achievements as short phrases"],
      "detected_tools": ["AI tools mentioned like Cursor, Claude, GPT-4, v0, Bolt, Copilot, etc. Only include if clearly mentioned."],
      "detected_stack": ["Main technologies and frameworks used - be specific (e.g., React, TypeScript, Node.js, PostgreSQL)"],
      "suggested_image_prompt": "A detailed prompt for generating a banner image (1-2 sentences, descriptive but not too long)"
    }

    LONG_DESCRIPTION FORMAT - Use this exact markdown structure (replace example content with actual project info):

    Example:
    ```
    This app transforms how teams collaborate on documents by providing real-time editing with intelligent suggestions. It eliminates the frustration of version conflicts and scattered feedback.

    ## Why It Exists

    Teams waste hours reconciling document versions and chasing down feedback across email threads. This solves that by bringing everything into one seamless workspace.

    ## Key Features

    - **Real-time Collaboration**: Multiple users can edit simultaneously without conflicts
    - **Smart Suggestions**: Get contextual recommendations as you write
    - **Unified Feedback**: All comments and revisions in one place

    ## Who It's For

    Perfect for remote teams, content creators, and anyone tired of document chaos.
    ```

    IMPORTANT: Do NOT include any brackets like [ ] in your output. Write actual content, not placeholders.

    Guidelines:
    - Be enthusiastic but accurate - don't make up features
    - Focus on what makes this project unique
    - The title should be catchy but honest
    - Description should make someone want to learn more
    - IMPORTANT: Do NOT include the title or project name anywhere in the long_description. It is displayed separately.
    - IMPORTANT: Do NOT include technical specifications in the descriptions. No framework names, library names, commands, or implementation details. The tech stack is captured separately in detected_stack. Focus on WHAT the project does and WHY it's useful, not HOW it's built.
    - Only include tools/stack that are clearly evident
    - For highlights, focus on concrete features, not vague statements
    - The image prompt should capture the essence and theme of the project

    Remember: Return ONLY the JSON object, nothing else. No markdown code blocks, no explanations.
    """
  end

  defp build_image_prompt(project_data, reference_images) do
    title = project_data["title"] || "Software Project"
    description = project_data["description"] || project_data["overview"] || ""
    stack = project_data["stack"] || []
    has_logo = reference_images != []

    # Determine visual theme based on stack
    theme = determine_theme(stack)

    # Build the base prompt
    base_prompt = """
    Create a professional banner image for a software project called "#{title}".

    PROJECT DESCRIPTION (use this to inspire the visual concept):
    #{description}

    Tech Stack: #{Enum.join(stack, ", ")}
    Visual Theme: #{theme}

    DESIGN REQUIREMENTS:
    - The visual design MUST be inspired by what the project does (read the description above)
    - Create an abstract, modern composition that represents the project's purpose
    - Use geometric shapes, flowing gradients, or tech patterns that evoke the project's functionality
    - Color palette should complement #{if has_logo, do: "the attached logo and ", else: ""}the tech stack theme
    - Clean, minimalist, professional aesthetic suitable for social media
    - Do NOT include any text in the image
    """

    # Add logo instructions if logos were found
    logo_instructions = if has_logo do
      """

      LOGO WATERMARK:
      I've attached the project's logo image. You MUST include it as a watermark:
      - Place a close copy of the logo in the TOP LEFT corner of the image
      - The logo should be small (approximately 10-15% of the image width)
      - Keep the logo SOLID and fully opaque (not transparent)
      - The logo serves as branding - the main focus should be the abstract background design
      - Match the overall color scheme to complement the logo
      """
    else
      ""
    end

    base_prompt <> logo_instructions
  end

  defp determine_theme(stack) do
    stack_lower = Enum.map(stack, &String.downcase/1)

    cond do
      Enum.any?(stack_lower, &String.contains?(&1, ["react", "vue", "angular", "frontend"])) ->
        "frontend development with blue and purple gradients"

      Enum.any?(stack_lower, &String.contains?(&1, ["node", "express", "django", "backend", "api"])) ->
        "backend development with green and teal gradients"

      Enum.any?(stack_lower, &String.contains?(&1, ["ai", "ml", "machine learning", "neural"])) ->
        "artificial intelligence with purple and pink gradients"

      Enum.any?(stack_lower, &String.contains?(&1, ["mobile", "ios", "android", "react native"])) ->
        "mobile development with orange and blue gradients"

      Enum.any?(stack_lower, &String.contains?(&1, ["blockchain", "web3", "crypto"])) ->
        "blockchain technology with gold and dark blue gradients"

      true ->
        "modern software development with vibrant tech gradients"
    end
  end

  defp parse_response(text) do
    # Clean up the text - remove markdown code blocks if present
    cleaned = text
    |> String.trim()
    |> String.replace(~r/^```json\s*/m, "")
    |> String.replace(~r/^```\s*/m, "")
    |> String.replace(~r/```$/m, "")
    |> String.trim()

    case Jason.decode(cleaned) do
      {:ok, data} ->
        # Validate required fields
        required_fields = ["title", "description", "long_description"]
        missing_fields = Enum.filter(required_fields, fn field ->
          is_nil(data[field]) || data[field] == ""
        end)

        if missing_fields != [] do
          {:error, "Missing required fields: #{Enum.join(missing_fields, ", ")}"}
        else
          {:ok, normalize_response(data)}
        end

      {:error, reason} ->
        {:error, "Failed to parse AI response as JSON: #{inspect(reason)}. Response: #{cleaned}"}
    end
  end

  defp normalize_response(data) do
    %{
      title: data["title"],
      description: data["description"],
      long_description: data["long_description"],
      highlights: data["highlights"] || [],
      tools: data["detected_tools"] || [],
      stack: data["detected_stack"] || [],
      suggested_image_prompt: data["suggested_image_prompt"]
    }
  end
end
