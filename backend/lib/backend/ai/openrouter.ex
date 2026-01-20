defmodule Backend.AI.OpenRouter do
  @moduledoc """
  HTTP client for OpenRouter API.
  Supports chat completions and image generation.
  """

  @base_url "https://openrouter.ai/api/v1"

  @doc """
  Sends a chat completion request to OpenRouter.

  Options:
    - `:model` - Model to use (default: "anthropic/claude-3.5-sonnet")
    - `:temperature` - Sampling temperature (default: 0.7)
    - `:max_tokens` - Maximum tokens to generate (optional)
  """
  def chat_completion(messages, opts \\ []) do
    model = Keyword.get(opts, :model, default_model())
    temperature = Keyword.get(opts, :temperature, 0.7)

    body = %{
      model: model,
      messages: messages,
      temperature: temperature
    }

    # Add max_tokens if specified
    body = if max_tokens = Keyword.get(opts, :max_tokens) do
      Map.put(body, :max_tokens, max_tokens)
    else
      body
    end

    case Req.post("#{@base_url}/chat/completions",
      json: body,
      headers: headers()
    ) do
      {:ok, %{status: 200, body: response}} ->
        {:ok, response}

      {:ok, %{status: 429, body: body}} ->
        {:error, "Rate limited by OpenRouter: #{inspect(body)}"}

      {:ok, %{status: status, body: body}} ->
        {:error, "OpenRouter API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to call OpenRouter API: #{inspect(error)}"}
    end
  end

  @doc """
  Generates an image using OpenRouter's image generation models.

  Options:
    - `:model` - Model to use (default: "black-forest-labs/flux.2-pro")
  """
  def generate_image(prompt, opts \\ []) do
    model = Keyword.get(opts, :model, image_model())

    # FLUX.2 Pro for image generation via chat completions
    # Requires modalities parameter for image output
    messages = [
      %{
        role: "user",
        content: prompt
      }
    ]

    body = %{
      model: model,
      messages: messages,
      # Required for image generation on OpenRouter
      modalities: ["image", "text"],
      # 16:9 aspect ratio via image_config
      image_config: %{
        aspect_ratio: "16:9"
      }
    }

    case Req.post("#{@base_url}/chat/completions",
      json: body,
      headers: headers(),
      receive_timeout: 120_000  # 2 minutes for image generation
    ) do
      {:ok, %{status: 200, body: response}} ->
        extract_image_from_response(response)

      {:ok, %{status: 429, body: body}} ->
        {:error, "Rate limited by OpenRouter: #{inspect(body)}"}

      {:ok, %{status: status, body: body}} ->
        {:error, "OpenRouter API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to generate image: #{inspect(error)}"}
    end
  end

  @doc """
  Generates an image with reference images using multimodal models.
  Supports models like GPT-5 Image that can incorporate reference images.

  Options:
    - `:model` - Model to use (default: "openai/gpt-5-image-mini")
  """
  def generate_image_with_references(prompt, reference_images, opts \\ []) do
    model = Keyword.get(opts, :model, multimodal_image_model())

    # Build content array with text prompt and image references
    # reference_images should be a list of {base64_content, mime_type} tuples or just base64 strings
    content = [%{type: "text", text: prompt}]

    content = content ++ Enum.map(reference_images, fn image_data ->
      {base64, mime_type} = case image_data do
        {b64, mime} -> {b64, mime}
        b64 when is_binary(b64) -> {b64, "image/png"}  # Default fallback
      end

      %{
        type: "image_url",
        image_url: %{
          url: "data:#{mime_type};base64,#{base64}"
        }
      }
    end)

    messages = [
      %{
        role: "user",
        content: content
      }
    ]

    body = %{
      model: model,
      messages: messages,
      # Required for image generation on OpenRouter
      modalities: ["image", "text"],
      # 16:9 aspect ratio via image_config
      image_config: %{
        aspect_ratio: "16:9"
      }
    }

    case Req.post("#{@base_url}/chat/completions",
      json: body,
      headers: headers(),
      receive_timeout: 120_000  # 2 minutes for image generation
    ) do
      {:ok, %{status: 200, body: response}} ->
        extract_image_from_response(response)

      {:ok, %{status: 429, body: body}} ->
        {:error, "Rate limited by OpenRouter: #{inspect(body)}"}

      {:ok, %{status: status, body: body}} ->
        {:error, "OpenRouter API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to generate image: #{inspect(error)}"}
    end
  end

  @doc """
  Streams a chat completion request from OpenRouter.
  Accepts a callback function that will be called for each chunk.

  Options:
    - `:model` - Model to use (default: "anthropic/claude-3.5-sonnet")
    - `:temperature` - Sampling temperature (default: 0.7)
    - `:max_tokens` - Maximum tokens to generate (optional)
  """
  def stream_chat_completion(messages, callback, opts \\ []) do
    model = Keyword.get(opts, :model, default_model())
    temperature = Keyword.get(opts, :temperature, 0.7)

    body = %{
      model: model,
      messages: messages,
      temperature: temperature,
      stream: true
    }

    # Add max_tokens if specified
    body = if max_tokens = Keyword.get(opts, :max_tokens) do
      Map.put(body, :max_tokens, max_tokens)
    else
      body
    end

    # Stream the response and call callback for each chunk
    Req.post("#{@base_url}/chat/completions",
      json: body,
      headers: headers(),
      receive_timeout: 60_000,
      into: fn {:data, data}, acc ->
        callback.(data)
        {:cont, acc}
      end
    )
  end

  @doc """
  Extracts the text content from a chat completion response.
  """
  def extract_text(response) do
    case response do
      %{"choices" => [%{"message" => %{"content" => content}} | _]} ->
        {:ok, content}

      _ ->
        {:error, "Unexpected response format"}
    end
  end

  # Private helper functions

  defp headers do
    [
      {"Authorization", "Bearer #{api_key()}"},
      {"HTTP-Referer", frontend_url()},
      {"X-Title", "Vibeslop"},
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

  defp default_model do
    Application.get_env(:backend, Backend.AI)[:default_model] ||
      "anthropic/claude-3.5-sonnet"
  end

  defp image_model do
    Application.get_env(:backend, Backend.AI)[:image_model] ||
      "black-forest-labs/flux.2-pro"
  end

  defp multimodal_image_model do
    Application.get_env(:backend, Backend.AI)[:multimodal_image_model] ||
      "openai/gpt-5-image-mini"
  end

  defp extract_image_from_response(response) do
    require Logger

    # FLUX models return images in the message.images array
    # Format: images[0]["image_url"]["url"] = "data:image/png;base64,..."
    Logger.debug("Image generation response: #{inspect(response)}")

    case response do
      # OpenRouter FLUX format: images array with nested image_url structure
      %{"choices" => [%{"message" => %{"images" => [%{"image_url" => %{"url" => url}} | _]}} | _]} ->
        Logger.info("Successfully extracted image URL from nested structure")
        {:ok, url}

      # Alternative: images array with direct URL
      %{"choices" => [%{"message" => %{"images" => [url | _]}} | _]} when is_binary(url) ->
        Logger.info("Successfully extracted image from images array (direct)")
        {:ok, url}

      # Alternative format: content field with data URL
      %{"choices" => [%{"message" => %{"content" => content}} | _]} when is_binary(content) and content != "" ->
        if String.starts_with?(content, "data:image") do
          Logger.info("Successfully extracted image from content field")
          {:ok, content}
        else
          if String.starts_with?(content, "http") do
            Logger.info("Got URL instead of data URL: #{content}")
            {:ok, content}
          else
            Logger.warning("Content is not an image: #{String.slice(content, 0, 100)}")
            {:error, "Response content is not an image"}
          end
        end

      # Check for error in response
      %{"error" => error} ->
        Logger.error("OpenRouter returned error: #{inspect(error)}")
        {:error, "OpenRouter error: #{inspect(error)}"}

      # Unknown format
      _ ->
        Logger.error("Unexpected image response format: #{inspect(response)}")
        {:error, "Unexpected image response format. Check logs for details."}
    end
  end
end
