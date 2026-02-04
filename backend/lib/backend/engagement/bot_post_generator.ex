defmodule Backend.Engagement.BotPostGenerator do
  @moduledoc """
  Generates realistic text post content for bot users using AI.

  Creates authentic-sounding developer posts about:
  - Tech learnings and discoveries
  - Coding tips and tricks
  - Industry observations
  - Questions to the community
  - Casual dev life updates
  """

  alias Backend.AI.OpenRouter

  require Logger

  @post_types [
    :learning,
    :tip,
    :observation,
    :question,
    :update,
    :hot_take,
    :celebration
  ]

  @doc """
  Generate a text post for a bot user.

  Returns {:ok, post_attrs} or {:error, reason}
  """
  def generate_post(bot_user, opts \\ []) do
    post_type = Keyword.get(opts, :post_type, Enum.random(@post_types))

    prompt = build_prompt(bot_user, post_type)

    messages = [
      %{
        role: "system",
        content: system_prompt(bot_user.persona_type)
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(messages, model: fast_model(), max_tokens: 300) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, text} ->
            {:ok, %{
              content: clean_post(text),
              user_id: bot_user.user_id
            }}

          {:error, reason} ->
            Logger.warning("BotPostGenerator: Failed to extract text: #{inspect(reason)}")
            {:ok, generate_fallback_post(bot_user, post_type)}
        end

      {:error, reason} ->
        Logger.warning("BotPostGenerator: AI generation failed: #{inspect(reason)}")
        {:ok, generate_fallback_post(bot_user, post_type)}
    end
  end

  @doc """
  Generate a quote post (commentary on existing content).
  """
  def generate_quote(bot_user, original_content) do
    content_text = extract_content_text(original_content)

    prompt = """
    Write a brief quote-tweet style comment on this post:

    ---
    #{String.slice(content_text, 0, 300)}
    ---

    Requirements:
    - 1-2 sentences, under 200 characters
    - Add your own perspective, reaction, or insight
    - Don't just repeat what they said
    - Sound natural, like a real developer
    - Occasionally be curious, impressed, or add a related thought

    Write only the comment text.
    """

    messages = [
      %{
        role: "system",
        content: system_prompt(bot_user.persona_type)
      },
      %{
        role: "user",
        content: prompt
      }
    ]

    case OpenRouter.chat_completion(messages, model: fast_model(), max_tokens: 150) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, text} -> {:ok, clean_post(text)}
          {:error, _} -> {:ok, fallback_quote()}
        end

      {:error, _} ->
        {:ok, fallback_quote()}
    end
  end

  defp system_prompt(persona_type) do
    base = "You are a real software developer posting on a social media platform for developers. Write authentic, natural posts."

    persona_context =
      case persona_type do
        "enthusiast" ->
          "You're passionate about tech, always learning something new, and love sharing discoveries. You post frequently and engage deeply."

        "casual" ->
          "You post occasionally, keeping things brief and low-key. You share casual observations about dev life."

        "supportive" ->
          "You enjoy sharing tips that help others and celebrating wins in the community. You're encouraging without being over the top."

        "lurker" ->
          "You rarely post, but when you do it's thoughtful and concise. You prefer quality over quantity."

        _ ->
          "You're a typical developer who shares thoughts naturally."
      end

    "#{base} #{persona_context}"
  end

  defp build_prompt(bot_user, post_type) do
    type_instruction = post_type_instruction(post_type)
    persona = bot_user.persona_type

    length_guide =
      case persona do
        "enthusiast" -> "2-4 sentences"
        "casual" -> "1-2 sentences, very brief"
        "supportive" -> "2-3 sentences"
        "lurker" -> "1 sentence, concise"
        _ -> "2-3 sentences"
      end

    """
    Write a #{type_instruction}

    Requirements:
    - #{length_guide}
    - Sound like a real developer, not a bot
    - Be specific when possible (mention technologies, concepts)
    - Don't use hashtags
    - Don't be overly promotional or generic
    - Vary your tone naturally

    Write only the post text, nothing else.
    """
  end

  defp post_type_instruction(:learning) do
    "post about something you recently learned in programming (a concept, technique, or discovery)"
  end

  defp post_type_instruction(:tip) do
    "quick developer tip or trick that others might find useful"
  end

  defp post_type_instruction(:observation) do
    "casual observation about software development, tech industry, or developer culture"
  end

  defp post_type_instruction(:question) do
    "genuine question to the developer community (about tech choices, best practices, or getting opinions)"
  end

  defp post_type_instruction(:update) do
    "casual update about what you're working on or coding today"
  end

  defp post_type_instruction(:hot_take) do
    "mildly spicy opinion about a tech topic (but not too controversial)"
  end

  defp post_type_instruction(:celebration) do
    "small win or milestone you're celebrating (shipped a feature, fixed a bug, learned something)"
  end

  defp clean_post(text) do
    text
    |> String.trim()
    |> String.trim("\"")
    |> String.trim("'")
    |> String.replace(~r/^["']|["']$/, "")
    |> String.trim()
  end

  defp extract_content_text(%Backend.Content.Post{} = post), do: post.content || ""
  defp extract_content_text(%Backend.Content.Project{} = project) do
    "#{project.title}\n\n#{project.description}"
  end
  defp extract_content_text(%{content: content}) when is_binary(content), do: content
  defp extract_content_text(%{title: title, description: desc}), do: "#{title}\n\n#{desc}"
  defp extract_content_text(_), do: ""

  defp fallback_quote do
    quotes = [
      "This is really well done",
      "Interesting approach here",
      "Nice work on this",
      "Been thinking about this too",
      "Solid implementation",
      "This is useful",
      "Good stuff"
    ]
    Enum.random(quotes)
  end

  @fallback_posts %{
    learning: [
      "TIL that PostgreSQL's EXPLAIN ANALYZE is way more useful than I thought. The buffer stats alone have saved me hours of debugging.",
      "Finally wrapped my head around React's useCallback. It's not about performance, it's about referential equality.",
      "Discovered you can use CSS container queries now and honestly it's a game changer for component libraries.",
      "Just learned about git worktrees. How did I not know about this sooner?",
      "Understanding the event loop in Node.js just clicked for me. Everything makes so much more sense now."
    ],
    tip: [
      "Quick tip: console.table() for arrays and objects. You're welcome.",
      "If you're not using git stash, you're making your life harder than it needs to be.",
      "Pro tip: name your database indexes. Future you will thank present you.",
      "Always log the error object, not just the message. The stack trace is where the gold is.",
      "Use semantic commit messages. 'fix stuff' helps no one, including future you."
    ],
    observation: [
      "It's wild how much time we spend naming things. And we're still bad at it.",
      "The best code is code you don't have to write. The second best is code someone else maintains.",
      "Every codebase has that one file everyone's afraid to touch.",
      "Documentation is a love letter to your future self.",
      "The gap between 'it works' and 'it's production ready' is always bigger than you think."
    ],
    question: [
      "What's everyone using for feature flags these days? Rolling my own feels wrong.",
      "Honest question: do you actually write tests first or is TDD just a myth?",
      "What's your go-to for quick prototypes? I've been bouncing between tools.",
      "How do you handle tech debt in a fast-moving codebase? Asking for a friend.",
      "What's the best way to stay current without burning out on the constant churn?"
    ],
    update: [
      "Debugging the same issue for the third hour. Coffee count: 4.",
      "Finally shipping that feature I've been working on all week. Feels good.",
      "Spent the morning refactoring and honestly the code is so much cleaner now.",
      "Today's agenda: figure out why the tests pass locally but fail in CI.",
      "Writing documentation today. Future me will probably still ignore it."
    ],
    hot_take: [
      "Hot take: most microservices should have been modules.",
      "TypeScript is just JavaScript with extra steps that are totally worth it.",
      "The best programming language is the one your team actually knows.",
      "Unpopular opinion: most premature optimization is actually premature abstraction.",
      "Framework fatigue is real but also kind of our own fault."
    ],
    celebration: [
      "Finally fixed that bug that's been haunting me for weeks. The fix was one line.",
      "Just deployed to production without breaking anything. Small wins.",
      "Hit 100% test coverage on this module. Yes I'm bragging.",
      "Shipped my first feature at the new job. Impostor syndrome: temporarily defeated.",
      "The code review came back with zero comments. Is this real life?"
    ]
  }

  defp generate_fallback_post(bot_user, post_type) do
    posts = Map.get(@fallback_posts, post_type, @fallback_posts.update)
    %{
      content: Enum.random(posts),
      user_id: bot_user.user_id
    }
  end

  defp fast_model do
    Application.get_env(:backend, Backend.AI)[:fast_model] ||
      "x-ai/grok-4.1-fast"
  end
end
