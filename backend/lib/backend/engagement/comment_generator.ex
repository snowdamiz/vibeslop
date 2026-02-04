defmodule Backend.Engagement.CommentGenerator do
  @moduledoc """
  Module for generating AI-powered authentic comments for simulated engagement.

  Uses OpenRouter API to generate realistic developer comments that:
  - Sound natural and authentic
  - Vary in tone (impressed, curious, supportive)
  - Match the bot's persona type
  - Are relevant to the content
  """

  alias Backend.AI.OpenRouter
  alias Backend.Engagement.EngagementBotUser

  require Logger

  @doc """
  Generates a comment for a piece of content using the bot's persona.

  Options:
  - `persona_type` - "enthusiast", "casual", "supportive", "lurker"
  - `content_type` - "Post" or "Project"
  """
  def generate_comment(content, bot_user, opts \\ [])

  def generate_comment(content, %EngagementBotUser{} = bot_user, opts) do
    generate_comment(content, bot_user.persona_type, opts)
  end

  def generate_comment(content, persona_type, _opts) when is_binary(persona_type) do
    content_text = extract_content_text(content)
    content_type = get_content_type(content)

    prompt = build_prompt(content_text, content_type, persona_type)

    messages = [
      %{
        role: "system",
        content: system_prompt(persona_type)
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(messages,
           model: fast_model(),
           temperature: 0.8,
           max_tokens: 100
         ) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, comment} ->
            # Clean up the comment (remove quotes if present)
            cleaned = clean_comment(comment)
            {:ok, cleaned}

          {:error, reason} ->
            Logger.warning("Failed to extract comment text: #{inspect(reason)}")
            {:ok, fallback_comment(persona_type)}
        end

      {:error, reason} ->
        Logger.warning("Failed to generate comment: #{inspect(reason)}")
        {:ok, fallback_comment(persona_type)}
    end
  end

  @doc """
  Generates multiple unique comments for batch engagement.
  """
  def generate_comments(content, bot_users, opts \\ []) do
    Enum.map(bot_users, fn bot_user ->
      case generate_comment(content, bot_user, opts) do
        {:ok, comment} -> {bot_user, comment}
        {:error, _} -> {bot_user, fallback_comment(bot_user.persona_type)}
      end
    end)
  end

  # Build the user prompt for comment generation
  defp build_prompt(content_text, content_type, _persona_type) do
    type_name = if content_type == "Post", do: "post", else: "project"

    """
    Write a brief, authentic comment for this developer #{type_name}:

    ---
    #{String.slice(content_text, 0, 500)}
    ---

    Requirements:
    - 1-2 sentences maximum
    - Sound like a real developer, not a bot
    - Be positive but not over-the-top
    - Vary your tone naturally (impressed, curious, supportive, or casual)
    - Occasionally ask a genuine question (20% of the time)
    - Don't start with "Great" or "Awesome" - be more creative
    - Don't use emoji unless it fits naturally

    Write only the comment text, nothing else.
    """
  end

  # System prompt based on persona type
  defp system_prompt(persona_type) do
    base = "You are a real software developer commenting on social media posts. Be authentic and natural."

    persona_context =
      case persona_type do
        "enthusiast" ->
          "You're excited about new tech and love discovering cool projects. You engage deeply with interesting content."

        "casual" ->
          "You browse casually and leave brief, friendly comments. Keep it short and simple."

        "supportive" ->
          "You enjoy supporting fellow developers, especially newcomers. You're encouraging without being over the top."

        "lurker" ->
          "You rarely comment but when you do, it's thoughtful and concise."

        _ ->
          "You're a typical developer who engages naturally with content."
      end

    "#{base} #{persona_context}"
  end

  # Extract text content from different content types
  defp extract_content_text(%Backend.Content.Post{} = post) do
    post.content || ""
  end

  defp extract_content_text(%Backend.Content.Project{} = project) do
    title = project.title || ""
    description = project.description || ""
    "#{title}\n\n#{description}"
  end

  defp extract_content_text(%{content: content}) when is_binary(content), do: content
  defp extract_content_text(%{title: title, description: desc}), do: "#{title}\n\n#{desc}"
  defp extract_content_text(%{title: title}), do: title
  defp extract_content_text(%{content: content}), do: to_string(content)
  defp extract_content_text(_), do: ""

  defp get_content_type(%Backend.Content.Post{}), do: "Post"
  defp get_content_type(%Backend.Content.Project{}), do: "Project"
  defp get_content_type(%{__struct__: struct}), do: struct |> Module.split() |> List.last()
  defp get_content_type(_), do: "Post"

  # Clean up generated comment
  defp clean_comment(comment) do
    comment
    |> String.trim()
    |> String.trim("\"")
    |> String.trim("'")
    |> String.replace(~r/^["']|["']$/, "")
    |> String.trim()
  end

  # Fallback comments when AI generation fails
  defp fallback_comment(persona_type) do
    comments =
      case persona_type do
        "enthusiast" ->
          [
            "This is really well done!",
            "Love the approach here",
            "Solid work, thanks for sharing",
            "Been looking for something like this",
            "Nice implementation!"
          ]

        "casual" ->
          [
            "Cool",
            "Nice!",
            "Looks good",
            "Neat project",
            "👍"
          ]

        "supportive" ->
          [
            "Keep it up!",
            "Great progress",
            "You should be proud of this",
            "Really coming along nicely",
            "Looking forward to seeing more"
          ]

        "lurker" ->
          [
            "Interesting",
            "Nice",
            "👀",
            "Noted",
            "Good stuff"
          ]

        _ ->
          [
            "Nice!",
            "Looks good",
            "Cool project",
            "Thanks for sharing",
            "Solid work"
          ]
      end

    Enum.random(comments)
  end

  # Fast model for quick comment generation
  defp fast_model do
    Application.get_env(:backend, Backend.AI)[:fast_model] ||
      "x-ai/grok-4.1-fast"
  end
end
