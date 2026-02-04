defmodule Backend.Engagement.MessageReplyGenerator do
  @moduledoc """
  Generates AI-powered conversational replies for bot users in DMs.

  Uses OpenRouter API to generate natural, contextual responses that:
  - Sound authentic and human-like
  - Match the bot's persona type
  - Take conversation context into account
  - Vary in length and style naturally
  """

  alias Backend.AI.OpenRouter
  alias Backend.Engagement.EngagementBotUser

  require Logger

  @doc """
  Generates a reply message for a bot user based on conversation context.

  Takes the conversation history (list of messages) and generates an appropriate
  response based on the bot's persona.
  """
  def generate_reply(messages, bot_user, recipient_user) do
    persona_type = get_persona_type(bot_user)
    bot_display_name = bot_user.user.display_name || bot_user.user.username
    recipient_name = recipient_user.display_name || recipient_user.username

    # Build conversation context from recent messages (last 10)
    recent_messages = Enum.take(messages, -10)

    prompt = build_prompt(recent_messages, bot_display_name, recipient_name, persona_type, bot_user.user.id)

    ai_messages = [
      %{
        role: "system",
        content: system_prompt(persona_type, bot_display_name, bot_user.user)
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(ai_messages,
           model: fast_model(),
           temperature: 0.85,
           max_tokens: 200
         ) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, reply} ->
            cleaned = clean_reply(reply)
            {:ok, cleaned}

          {:error, reason} ->
            Logger.warning("Failed to extract reply text: #{inspect(reason)}")
            {:ok, fallback_reply(persona_type)}
        end

      {:error, reason} ->
        Logger.warning("Failed to generate message reply: #{inspect(reason)}")
        {:ok, fallback_reply(persona_type)}
    end
  end

  @doc """
  Generates a reply without needing the full bot_user struct.
  Uses just the persona type.
  """
  def generate_reply(messages, persona_type, bot_name, recipient_name, bot_user_id)
      when is_binary(persona_type) do
    recent_messages = Enum.take(messages, -10)

    prompt = build_prompt(recent_messages, bot_name, recipient_name, persona_type, bot_user_id)

    ai_messages = [
      %{
        role: "system",
        content: simple_system_prompt(persona_type, bot_name)
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(ai_messages,
           model: fast_model(),
           temperature: 0.85,
           max_tokens: 200
         ) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, reply} ->
            cleaned = clean_reply(reply)
            {:ok, cleaned}

          {:error, reason} ->
            Logger.warning("Failed to extract reply text: #{inspect(reason)}")
            {:ok, fallback_reply(persona_type)}
        end

      {:error, reason} ->
        Logger.warning("Failed to generate message reply: #{inspect(reason)}")
        {:ok, fallback_reply(persona_type)}
    end
  end

  # Get the persona type, defaulting to "casual" if not an engagement bot
  defp get_persona_type(%EngagementBotUser{persona_type: persona_type}), do: persona_type
  defp get_persona_type(_), do: "casual"

  # Build the prompt for the AI
  defp build_prompt(messages, bot_name, recipient_name, _persona_type, bot_user_id) do
    conversation_text =
      messages
      |> Enum.map(fn msg ->
        sender_name = if msg.sender_id == bot_user_id, do: bot_name, else: recipient_name
        "#{sender_name}: #{msg.content}"
      end)
      |> Enum.join("\n")

    """
    You're #{bot_name}, chatting in a DM with #{recipient_name} on a developer social platform.

    Here's the recent conversation:
    ---
    #{conversation_text}
    ---

    Write your next reply as #{bot_name}. Keep it natural, casual, and conversational.
    - Be friendly but not overly enthusiastic
    - Match the tone of the conversation
    - Keep it brief (1-3 sentences usually)
    - Don't use emoji unless the other person has been using them
    - You can ask follow-up questions naturally
    - Sound like a real developer having a normal chat

    Reply as #{bot_name} (just the message, nothing else):
    """
  end

  # System prompt based on persona type
  defp system_prompt(persona_type, bot_name, bot_user) do
    bio = bot_user.bio || ""

    base =
      "You are #{bot_name}, a real software developer chatting on a social platform. " <>
        "You're having a casual DM conversation. Be authentic, natural, and conversational."

    bio_context = if bio != "", do: " Your bio says: #{bio}", else: ""

    persona_context =
      case persona_type do
        "enthusiast" ->
          " You're passionate about tech and love discussing new projects and ideas. " <>
            "You're engaged and curious but not overwhelming."

        "casual" ->
          " You're laid-back and friendly. You keep things simple and don't overcomplicate conversations."

        "supportive" ->
          " You're encouraging and supportive, especially with other developers. " <>
            "You like to help when you can."

        "lurker" ->
          " You're usually quiet but when you do chat, you're thoughtful and concise. " <>
            "You prefer shorter responses."

        _ ->
          " You're a typical developer who chats naturally."
      end

    "#{base}#{bio_context}#{persona_context}"
  end

  defp simple_system_prompt(persona_type, bot_name) do
    base =
      "You are #{bot_name}, a software developer chatting casually on a social platform. " <>
        "Be authentic and natural in conversation."

    persona_context =
      case persona_type do
        "enthusiast" -> " You're excited about tech but not over the top."
        "casual" -> " You're laid-back and keep things simple."
        "supportive" -> " You're encouraging and helpful."
        "lurker" -> " You prefer brief, thoughtful responses."
        _ -> ""
      end

    "#{base}#{persona_context}"
  end

  # Clean up generated reply
  defp clean_reply(reply) do
    reply
    |> String.trim()
    |> String.replace(~r/^["']|["']$/, "")
    |> String.replace(~r/^#{Regex.escape("bot_name")}:\s*/i, "")
    |> String.trim()
  end

  # Fallback replies when AI generation fails
  defp fallback_reply(persona_type) do
    replies =
      case persona_type do
        "enthusiast" ->
          [
            "That's interesting! Tell me more",
            "Oh nice, I've been thinking about that too",
            "Yeah I totally get that",
            "Sounds cool! How's it going?"
          ]

        "casual" ->
          [
            "Nice",
            "Cool, thanks for sharing",
            "Yeah makes sense",
            "Gotcha"
          ]

        "supportive" ->
          [
            "That sounds great!",
            "Keep it up!",
            "I think you're on the right track",
            "Happy to hear that"
          ]

        "lurker" ->
          [
            "I see",
            "Interesting",
            "Makes sense",
            "Got it"
          ]

        _ ->
          [
            "Thanks for the message!",
            "That's cool",
            "Nice, thanks for sharing",
            "Sounds good"
          ]
      end

    Enum.random(replies)
  end

  # Fast model for quick response generation
  defp fast_model do
    Application.get_env(:backend, Backend.AI)[:fast_model] ||
      "x-ai/grok-4.1-fast"
  end
end
