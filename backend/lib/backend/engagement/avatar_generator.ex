defmodule Backend.Engagement.AvatarGenerator do
  @moduledoc """
  Generates AI profile avatars for bot users using the same image generation
  model as project cover images (Google Gemini 3 Pro Image Preview).
  """

  require Logger

  @doc """
  Generates a profile avatar for a bot user based on their persona and display name.
  Returns {:ok, image_url} or {:error, reason}.
  """
  def generate_avatar(display_name, persona_type, opts \\ []) do
    prompt = build_avatar_prompt(display_name, persona_type, opts)

    Logger.info("Generating avatar for bot: #{display_name} (#{persona_type})")

    case generate_image_with_aspect_ratio(prompt, "1:1") do
      {:ok, image_url} = result ->
        Logger.info("Successfully generated avatar for #{display_name}")
        # Mark as AI generated for tracking
        Backend.AI.ImageCache.mark_as_ai_generated(image_url)
        result

      {:error, reason} = error ->
        Logger.warning("Failed to generate avatar for #{display_name}: #{inspect(reason)}")
        error
    end
  end

  @doc """
  Generates an avatar with fallback to a placeholder if AI generation fails.
  Always returns {:ok, url} - uses DiceBear placeholder as fallback.
  """
  def generate_avatar_with_fallback(display_name, persona_type, opts \\ []) do
    case generate_avatar(display_name, persona_type, opts) do
      {:ok, url} -> {:ok, url}
      {:error, _reason} ->
        # Fallback to DiceBear placeholder
        Logger.info("Using placeholder avatar for #{display_name}")
        {:ok, generate_placeholder_url(display_name)}
    end
  end

  # Private functions

  defp build_avatar_prompt(_display_name, persona_type, _opts) do
    # Content safety policy
    content_policy = """
    CONTENT POLICY (STRICT REQUIREMENTS):
    - Generate ONLY professional, work-appropriate imagery
    - NO nudity, sexual content, or suggestive imagery of any kind
    - Create clean, professional visuals suitable for a social media profile
    """

    # Persona-based style variations
    style_description = persona_style(persona_type)

    """
    #{content_policy}

    Create a professional profile avatar for a software developer.

    REQUIREMENTS:
    - Single person portrait, head and shoulders only
    - Modern, digital illustration style (NOT photorealistic)
    - Clean, minimal background with subtle gradient
    - Professional but approachable expression
    - Good lighting, clear details
    - #{style_description}

    STYLE:
    - Contemporary digital art style similar to Notion avatars or modern app profiles
    - Soft, clean lines with subtle shading
    - Vibrant but not overwhelming colors
    - The person should look like a friendly, professional developer

    DO NOT include:
    - Any text or watermarks
    - Multiple people
    - Full body shots
    - Cluttered backgrounds
    - Photorealistic rendering
    """
  end

  defp persona_style(persona_type) do
    case persona_type do
      "enthusiast" ->
        "Energetic and passionate look, bright colors, confident expression, modern tech-forward vibe"

      "casual" ->
        "Relaxed and friendly appearance, warm colors, approachable smile, casual professional look"

      "supportive" ->
        "Warm and welcoming expression, soft colors, kind eyes, community-oriented vibe"

      "lurker" ->
        "Thoughtful and observant look, muted colors, subtle expression, introverted creative type"

      _ ->
        "Professional developer appearance, balanced colors, neutral friendly expression"
    end
  end

  # Generate image with specific aspect ratio (1:1 for avatars)
  defp generate_image_with_aspect_ratio(prompt, aspect_ratio) do
    model = image_model()

    messages = [
      %{
        role: "user",
        content: prompt
      }
    ]

    body = %{
      model: model,
      messages: messages,
      modalities: ["image", "text"],
      image_config: %{
        aspect_ratio: aspect_ratio
      }
    }

    case Req.post("https://openrouter.ai/api/v1/chat/completions",
           json: body,
           headers: headers(),
           receive_timeout: 120_000
         ) do
      {:ok, %{status: 200, body: response}} ->
        extract_image_from_response(response)

      {:ok, %{status: 429, body: body}} ->
        {:error, "Rate limited by OpenRouter: #{inspect(body)}"}

      {:ok, %{status: status, body: body}} ->
        {:error, "OpenRouter API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to generate avatar: #{inspect(error)}"}
    end
  end

  defp extract_image_from_response(response) do
    case response do
      # OpenRouter format: images array with nested image_url structure
      %{"choices" => [%{"message" => %{"images" => [%{"image_url" => %{"url" => url}} | _]}} | _]} ->
        {:ok, url}

      # Alternative: images array with direct URL
      %{"choices" => [%{"message" => %{"images" => [url | _]}} | _]} when is_binary(url) ->
        {:ok, url}

      # Alternative format: content field with data URL
      %{"choices" => [%{"message" => %{"content" => content}} | _]}
      when is_binary(content) and content != "" ->
        if String.starts_with?(content, "data:image") or String.starts_with?(content, "http") do
          {:ok, content}
        else
          {:error, "Response content is not an image"}
        end

      %{"error" => error} ->
        {:error, "OpenRouter error: #{inspect(error)}"}

      _ ->
        {:error, "Unexpected image response format"}
    end
  end

  defp generate_placeholder_url(display_name) do
    # Use DiceBear for consistent placeholder avatars
    seed = :crypto.hash(:md5, display_name) |> Base.encode16(case: :lower) |> String.slice(0, 8)
    "https://api.dicebear.com/7.x/avataaars/svg?seed=#{seed}"
  end

  defp headers do
    [
      {"Authorization", "Bearer #{api_key()}"},
      {"HTTP-Referer", frontend_url()},
      {"X-Title", "Onvibe"},
      {"Content-Type", "application/json"}
    ]
  end

  defp api_key do
    Application.get_env(:backend, Backend.AI)[:openrouter_api_key] ||
      System.get_env("OPENROUTER_API_KEY") ||
      raise "OPENROUTER_API_KEY not configured"
  end

  defp frontend_url do
    Application.get_env(:backend, :frontend_url) ||
      System.get_env("FRONTEND_URL") ||
      "http://localhost:5173"
  end

  defp image_model do
    Application.get_env(:backend, Backend.AI)[:image_model] ||
      "google/gemini-3-pro-image-preview"
  end
end
