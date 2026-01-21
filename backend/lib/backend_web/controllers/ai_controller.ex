defmodule BackendWeb.AIController do
  use BackendWeb, :controller

  alias Backend.GitHub.Client, as: GitHubClient
  alias Backend.AI.{ProjectGenerator, RateLimiter}

  @doc """
  Generates project post content from a GitHub repository.

  Request body:
    {
      "repo": {
        "owner": "username",
        "name": "repo-name"
      }
    }
  """
  def generate_project(conn, %{"repo" => %{"owner" => owner, "name" => repo}}) do
    user = conn.assigns.current_user

    # Check rate limit
    case RateLimiter.check_text_generation(user.id) do
      :ok ->
        do_generate_project(conn, user, owner, repo)

      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: "rate_limited",
          message: "You've reached your hourly limit for AI generation. Please try again later."
        })
    end
  end

  def generate_project(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: "invalid_params",
      message: "Missing required parameters: repo.owner and repo.name"
    })
  end

  @doc """
  Generates a cover image for a project.

  Request body:
    {
      "project": {
        "title": "Project Name",
        "stack": ["React", "TypeScript"],
        ...
      },
      "repo": {  // Optional
        "owner": "username",
        "name": "repo-name"
      }
    }
  """
  def generate_image(conn, %{"project" => project_data} = params) do
    user = conn.assigns.current_user

    # Check rate limit
    case RateLimiter.check_image_generation(user.id) do
      :ok ->
        repo_params = Map.get(params, "repo")
        do_generate_image(conn, user, project_data, repo_params)

      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: "rate_limited",
          message:
            "You've reached your hourly limit for image generation. Please try again later."
        })
    end
  end

  def generate_image(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: "invalid_params",
      message: "Missing required parameter: project"
    })
  end

  @doc """
  Improves a post using AI with streaming response.

  Request body:
    {
      "content": "Original post content..."
    }
  """
  def improve_post(conn, %{"content" => content}) do
    user = conn.assigns.current_user

    # Check rate limit
    case RateLimiter.check_text_generation(user.id) do
      :ok ->
        do_improve_post(conn, content)

      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: "rate_limited",
          message: "You've reached your hourly limit for AI generation. Please try again later."
        })
    end
  end

  def improve_post(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: "invalid_params",
      message: "Missing required parameter: content"
    })
  end

  @doc """
  Improves a gig description using AI with streaming response.

  Request body:
    {
      "content": "Original gig description..."
    }
  """
  def improve_gig(conn, %{"content" => content}) do
    user = conn.assigns.current_user

    # Check rate limit
    case RateLimiter.check_text_generation(user.id) do
      :ok ->
        do_improve_gig(conn, content)

      {:error, :rate_limited} ->
        conn
        |> put_status(:too_many_requests)
        |> json(%{
          error: "rate_limited",
          message: "You've reached your hourly limit for AI generation. Please try again later."
        })
    end
  end

  def improve_gig(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      error: "invalid_params",
      message: "Missing required parameter: content"
    })
  end

  @doc """
  Gets the current rate limit status for the user.
  """
  def quota(conn, _params) do
    user = conn.assigns.current_user

    with {:ok, text_quota} <- RateLimiter.get_text_quota(user.id),
         {:ok, image_quota} <- RateLimiter.get_image_quota(user.id) do
      conn
      |> put_status(:ok)
      |> json(%{
        text_generation: text_quota,
        image_generation: image_quota
      })
    else
      {:error, reason} ->
        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: "quota_check_failed",
          message: "Failed to check rate limit quota",
          details: inspect(reason)
        })
    end
  end

  # Private helper functions

  defp do_generate_project(conn, user, owner, repo) do
    require Logger

    unless user.github_access_token do
      conn
      |> put_status(:unauthorized)
      |> json(%{
        error: "github_not_connected",
        message: "GitHub account not connected. Please reconnect your GitHub account."
      })
    else
      # Fetch repository details from GitHub
      case GitHubClient.get_repo_details(user.github_access_token, owner, repo) do
        {:ok, repo_details} ->
          # Verify the user owns or has access to this repository
          if can_access_repo?(user, repo_details.repo) do
            # Generate project content using AI
            case ProjectGenerator.generate_from_repo(repo_details) do
              {:ok, generated_content} ->
                # Add GitHub URL to links
                github_url = repo_details.repo["html_url"]
                live_url = repo_details.repo["homepage"]

                content_with_links =
                  Map.merge(generated_content, %{
                    links: %{
                      github: github_url,
                      live: live_url
                    }
                  })

                # Also generate the cover image (if rate limit allows)
                cover_image =
                  case RateLimiter.check_image_generation(user.id) do
                    :ok ->
                      Logger.info("Generating cover image as part of project generation")

                      repo_info = %{
                        access_token: user.github_access_token,
                        owner: owner,
                        repo: repo
                      }

                      project_data = %{
                        "title" => generated_content.title,
                        "description" => generated_content.description,
                        "stack" => generated_content.stack
                      }

                      case ProjectGenerator.generate_image(project_data, repo_info) do
                        {:ok, image} ->
                          image

                        {:error, reason} ->
                          Logger.warning("Cover image generation failed: #{inspect(reason)}")
                          nil
                      end

                    {:error, :rate_limited} ->
                      Logger.info("Skipping cover image - rate limited")
                      nil
                  end

                # Include cover image in response if generated
                final_content =
                  if cover_image do
                    Map.put(content_with_links, :cover_image, cover_image)
                  else
                    content_with_links
                  end

                conn
                |> put_status(:ok)
                |> json(%{data: final_content})

              {:error, reason} ->
                conn
                |> put_status(:internal_server_error)
                |> json(%{
                  error: "generation_failed",
                  message: "Failed to generate project content",
                  details: reason
                })
            end
          else
            conn
            |> put_status(:forbidden)
            |> json(%{
              error: "access_denied",
              message: "You don't have access to this repository"
            })
          end

        {:error, reason} ->
          conn
          |> put_status(:bad_gateway)
          |> json(%{
            error: "github_api_error",
            message: "Failed to fetch repository from GitHub",
            details: reason
          })
      end
    end
  end

  defp do_generate_image(conn, user, project_data, repo_params) do
    require Logger
    Logger.info("Generating image with data: #{inspect(project_data)}")

    # Build repo_info if repo params provided and user has GitHub token
    repo_info =
      case repo_params do
        %{"owner" => owner, "name" => repo} when not is_nil(user.github_access_token) ->
          %{
            access_token: user.github_access_token,
            owner: owner,
            repo: repo
          }

        _ ->
          nil
      end

    if repo_info do
      Logger.info("Searching for logos in #{repo_info.owner}/#{repo_info.repo}")
    end

    case ProjectGenerator.generate_image(project_data, repo_info) do
      {:ok, image_base64} ->
        Logger.info("Image generated successfully")

        conn
        |> put_status(:ok)
        |> json(%{data: %{image: image_base64}})

      {:error, reason} ->
        Logger.error("Image generation failed: #{inspect(reason)}")

        conn
        |> put_status(:internal_server_error)
        |> json(%{
          error: "image_generation_failed",
          message: "Failed to generate cover image",
          details: inspect(reason)
        })
    end
  end

  # Verify user has access to the repository
  defp can_access_repo?(user, repo_data) do
    owner_login = repo_data["owner"]["login"]

    # Check if the user's GitHub username matches the repo owner
    # or if the repo is public (we fetched it successfully with their token)
    user.github_username == owner_login || !repo_data["private"]
  end

  defp do_improve_post(conn, content) do
    require Logger

    # System prompt for post improvement with personality adaptation
    system_prompt = """
    You're helping developers share their thoughts on a tech social platform. Your job is to take their post and make it sound more natural, engaging, and human - like something a real person would actually write.

    PERSONALITY ADAPTATION - Choose based on the post's vibe:

    1. EDGY/SARCASTIC: For rants, hot takes, controversial opinions, frustrations with tech
       - Use sharp wit, slight irreverence, maybe some subtle snark
       - "honestly", "let's be real", "no cap", casual swearing if appropriate
       - Don't hold back on the spice

    2. PROFESSIONAL/THOUGHTFUL: For serious technical discussions, career advice, architecture decisions
       - Clear, articulate, but still conversational
       - "Here's the thing:", "Worth noting:", "Quick thought:"
       - Authoritative but not pompous

    3. EXCITED/HYPED: For sharing wins, new discoveries, cool projects, breakthrough moments
       - Genuine enthusiasm, exclamation points are OK here
       - "Just", "Finally", "Holy shit this is cool"
       - Let the excitement show through

    4. CASUAL/RELATABLE: For everyday coding stuff, memes, relatable struggles
       - Friendly, conversational, like talking to a colleague
       - "tbh", "ngl", "lol", casual abbreviations
       - Make it feel like a coffee chat

    RULES:
    - Keep the original meaning and core message intact
    - Match the author's energy level (don't make a rant sound polite, don't make excitement sound corporate)
    - Natural language only - write like humans actually talk
    - If they used hashtags/emojis, keep them; otherwise don't add them
    - Keep it concise (under 280 chars if possible, unless the original was longer)
    - NO explanations, quotes, or meta-commentary
    - Just output the improved post, nothing else

    Read the vibe, pick the right personality, and make it sound real.
    """

    messages = [
      %{role: "system", content: system_prompt},
      %{role: "user", content: content}
    ]

    # Start SSE streaming
    conn =
      conn
      |> put_resp_content_type("text/event-stream")
      |> put_resp_header("cache-control", "no-cache")
      |> put_resp_header("connection", "keep-alive")
      |> send_chunked(200)

    # Stream callback that forwards chunks to the client
    stream_callback = fn data ->
      process_and_forward_chunk(conn, data)
    end

    # Use Grok 4.1 Fast for post improvement
    case Backend.AI.OpenRouter.stream_chat_completion(messages, stream_callback,
           model: "x-ai/grok-4.1-fast"
         ) do
      {:ok, %{status: 200}} ->
        # Stream completed successfully
        send_sse_chunk(conn, "[DONE]")
        conn

      {:ok, %{status: 429}} ->
        send_sse_error(conn, "Rate limited by AI provider. Please try again later.")
        conn

      {:ok, %{status: status}} ->
        Logger.error("OpenRouter returned status #{status}")
        send_sse_error(conn, "AI service error. Please try again.")
        conn

      {:error, error} ->
        Logger.error("Failed to call OpenRouter: #{inspect(error)}")
        send_sse_error(conn, "Failed to connect to AI service.")
        conn
    end
  end

  defp do_improve_gig(conn, content) do
    require Logger

    # System prompt for gig description improvement
    system_prompt = """
    You are a professional freelance gig description writer. Your job is to transform rough gig descriptions into clear, compelling, and well-structured project briefs that attract quality developers.

    FORMAT YOUR OUTPUT USING MARKDOWN with the following sections as appropriate:

    ## Project Overview
    A clear, concise summary of what needs to be built (2-3 sentences max).

    ## Requirements
    - Bullet points of specific features/functionality needed
    - Be specific and measurable where possible
    - Group related requirements together

    ## Deliverables
    - What the developer should submit when done
    - Include any specific files, documentation, or handoff requirements

    ## Technical Requirements (if applicable)
    - Any specific tech stack, frameworks, or tools required
    - API integrations, third-party services
    - Performance requirements, browser support, etc.

    ## Additional Context (if the original mentions it)
    - Timeline expectations, budget considerations
    - Communication preferences
    - Any other relevant details

    IMPORTANT RULES:
    1. ONLY include sections that are relevant based on the original content
    2. Don't invent requirements not implied by the original
    3. Keep the same scope and complexity as the original
    4. Use professional but approachable language (not corporate buzzwords)
    5. Be specific and actionable - vague descriptions lead to mismatched expectations
    6. If the original is very brief, expand slightly but don't over-engineer
    7. Output ONLY the improved description in markdown format - no explanations, no meta-commentary
    8. Don't include a title or heading that duplicates the gig title

    Transform messy ideas into crystal-clear project specs that developers will love to read.
    """

    messages = [
      %{role: "system", content: system_prompt},
      %{role: "user", content: content}
    ]

    # Start SSE streaming
    conn =
      conn
      |> put_resp_content_type("text/event-stream")
      |> put_resp_header("cache-control", "no-cache")
      |> put_resp_header("connection", "keep-alive")
      |> send_chunked(200)

    # Stream callback that forwards chunks to the client
    stream_callback = fn data ->
      process_and_forward_chunk(conn, data)
    end

    # Use Grok 4.1 Fast for gig improvement
    case Backend.AI.OpenRouter.stream_chat_completion(messages, stream_callback,
           model: "x-ai/grok-4.1-fast"
         ) do
      {:ok, %{status: 200}} ->
        # Stream completed successfully
        send_sse_chunk(conn, "[DONE]")
        conn

      {:ok, %{status: 429}} ->
        send_sse_error(conn, "Rate limited by AI provider. Please try again later.")
        conn

      {:ok, %{status: status}} ->
        Logger.error("OpenRouter returned status #{status}")
        send_sse_error(conn, "AI service error. Please try again.")
        conn

      {:error, error} ->
        Logger.error("Failed to call OpenRouter: #{inspect(error)}")
        send_sse_error(conn, "Failed to connect to AI service.")
        conn
    end
  end

  defp process_and_forward_chunk(conn, data) do
    require Logger

    # Parse SSE format from OpenRouter
    lines = String.split(data, "\n")

    for line <- lines do
      if String.starts_with?(line, "data: ") do
        chunk_data = String.slice(line, 6..-1//1) |> String.trim()

        unless chunk_data == "" or chunk_data == "[DONE]" do
          case Jason.decode(chunk_data) do
            {:ok, %{"choices" => [%{"delta" => %{"content" => content}} | _]}}
            when content != "" ->
              # Forward the content to client
              send_sse_chunk(conn, %{content: content})

            {:ok, _} ->
              # Other chunk types (role, etc.), skip
              :ok

            {:error, reason} ->
              Logger.debug("Skipping non-JSON SSE data: #{inspect(reason)}")
              :ok
          end
        end
      end
    end
  end

  defp send_sse_chunk(conn, "[DONE]") do
    chunk(conn, "data: [DONE]\n\n")
  end

  defp send_sse_chunk(conn, data) when is_map(data) do
    require Logger

    case Jason.encode(data) do
      {:ok, json} ->
        chunk(conn, "data: #{json}\n\n")

      {:error, _} ->
        Logger.error("Failed to encode SSE data")
        :ok
    end
  end

  defp send_sse_error(conn, message) do
    case Jason.encode(%{error: message}) do
      {:ok, json} ->
        chunk(conn, "data: #{json}\n\n")

      {:error, _} ->
        :ok
    end
  end
end
