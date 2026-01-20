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
          message: "You've reached your hourly limit for image generation. Please try again later."
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

                content_with_links = Map.merge(generated_content, %{
                  links: %{
                    github: github_url,
                    live: live_url
                  }
                })

                # Also generate the cover image (if rate limit allows)
                cover_image = case RateLimiter.check_image_generation(user.id) do
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
                      {:ok, image} -> image
                      {:error, reason} ->
                        Logger.warning("Cover image generation failed: #{inspect(reason)}")
                        nil
                    end
                  {:error, :rate_limited} ->
                    Logger.info("Skipping cover image - rate limited")
                    nil
                end

                # Include cover image in response if generated
                final_content = if cover_image do
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
    repo_info = case repo_params do
      %{"owner" => owner, "name" => repo} when not is_nil(user.github_access_token) ->
        %{
          access_token: user.github_access_token,
          owner: owner,
          repo: repo
        }
      _ -> nil
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
end
