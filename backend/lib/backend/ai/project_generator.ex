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
  Generates a cover image for a project.
  Optionally accepts repo_info to search for and incorporate logos.
  """
  def generate_image(project_data, repo_info \\ nil) do
    require Logger

    # If repo info provided, try to find logos
    reference_images = case repo_info do
      %{access_token: token, owner: owner, repo: repo} ->
        Logger.info("Attempting to find logos for #{owner}/#{repo}")
        case Backend.GitHub.Client.find_logos(token, owner, repo) do
          {:ok, [_ | _] = logos} ->
            Logger.info("Found #{length(logos)} logo(s) - using multimodal generation")
            logos
          {:ok, []} ->
            Logger.warning("No logos found in repository - generating without logo")
            []
          {:error, reason} ->
            Logger.error("Logo search failed: #{inspect(reason)} - generating without logo")
            []
        end
      _ ->
        Logger.info("No repo info provided - generating without logo")
        []
    end

    # Generate with or without reference images
    if reference_images != [] do
      enhanced_prompt = build_image_prompt_with_logo(project_data)
      Logger.info("Using logo-based prompt with #{length(reference_images)} reference image(s)")
      OpenRouter.generate_image_with_references(enhanced_prompt, reference_images)
    else
      prompt = build_image_prompt(project_data)
      Logger.info("Using basic prompt without logo")
      OpenRouter.generate_image(prompt)
    end
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
      "description": "Compelling 2-3 sentence markdown summary for social feed (150-250 chars)",
      "long_description": "Detailed markdown description with paragraphs, explaining what the project does, why it's useful, and key features (200-400 words). Use markdown formatting like **bold**, bullet points, etc.",
      "highlights": ["3-5 key features or achievements as short phrases"],
      "detected_tools": ["AI tools mentioned like Cursor, Claude, GPT-4, v0, Bolt, Copilot, etc. Only include if clearly mentioned."],
      "detected_stack": ["Main technologies and frameworks used - be specific (e.g., React, TypeScript, Node.js, PostgreSQL)"],
      "suggested_image_prompt": "A detailed prompt for generating a banner image (1-2 sentences, descriptive but not too long)"
    }

    Guidelines:
    - Be enthusiastic but accurate - don't make up features
    - Focus on what makes this project unique
    - The title should be catchy but honest
    - Description should make someone want to learn more
    - Long description should be well-structured with markdown
    - Only include tools/stack that are clearly evident
    - For highlights, focus on concrete features, not vague statements
    - The image prompt should capture the essence and theme of the project

    Remember: Return ONLY the JSON object, nothing else. No markdown code blocks, no explanations.
    """
  end

  defp build_image_prompt(project_data) do
    title = project_data["title"] || "Software Project"
    description = project_data["description"] || project_data["overview"] || ""
    stack = project_data["stack"] || []

    # Determine theme based on stack
    theme = determine_theme(stack)

    """
    Create a modern, professional 16:9 banner image for a software project.

    Project: #{title}
    Project Overview: #{description}
    Tech Stack: #{Enum.join(stack, ", ")}
    Visual Theme: #{theme}

    The main image design should be inspired by the project overview and what the project does.
    Use the tech stack to inform color choices and stylistic elements, but the core visual concept
    should represent the project's purpose and functionality.

    Style: Clean, minimalist, tech-focused design with abstract geometric shapes and modern gradients.
    No text should appear in the image. The image should be suitable for social media sharing.
    Dimensions: 16:9 aspect ratio (1792x1024 pixels). Professional and modern aesthetic.
    The design should evoke the feeling of modern software development and innovation.
    """
  end

  defp build_image_prompt_with_logo(project_data) do
    title = project_data["title"] || "Software Project"
    description = project_data["description"] || project_data["overview"] || ""
    stack = project_data["stack"] || []

    # Determine visual theme based on stack
    theme = determine_theme(stack)

    """
    Create a creative, professional 16:9 banner image for a software project called "#{title}".

    Project Overview: #{description}
    Tech Stack: #{Enum.join(stack, ", ")}
    Visual Theme: #{theme}

    The main image design should be inspired by the project overview and what the project does.
    Use the tech stack and the attached logo to inform your color palette and design choices.

    I've attached the project's logo. Incorporate it as a subtle, professional watermark in a
    corner of the image. The logo should be small (about 10-15% of image width) and blend
    naturally with the design so it doesn't dominate the composition.

    The banner should be an ORIGINAL creative composition featuring:
    - Dynamic abstract background that represents the project's purpose (based on the overview)
    - Geometric shapes, flowing gradients, or tech patterns inspired by the project's functionality
    - Visual elements that evoke #{Enum.take(stack, 2) |> Enum.join(" and ")} development
    - Color palette complementary to the logo
    - Modern, innovative, professional aesthetic

    Important:
    - The main focus should be the creative abstract background that tells the project's story
    - The logo should be a subtle branding element, NOT the main focus
    - No additional text in the image
    - Colors and style should feel cohesive with the logo

    Style: Modern tech banner with abstract art background.
    Dimensions: 16:9 aspect ratio.
    """
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
