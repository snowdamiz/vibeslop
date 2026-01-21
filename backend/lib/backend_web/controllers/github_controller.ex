defmodule BackendWeb.GitHubController do
  use BackendWeb, :controller

  alias Backend.GitHub.Client

  @doc """
  Lists the authenticated user's GitHub repositories.
  """
  def index(conn, params) do
    user = conn.assigns.current_user

    unless user.github_access_token do
      conn
      |> put_status(:unauthorized)
      |> json(%{
        error: "github_not_connected",
        message: "GitHub account not connected. Please reconnect your GitHub account."
      })
    else
      opts = [
        per_page: parse_int(params["per_page"], 30),
        page: parse_int(params["page"], 1),
        sort: params["sort"] || "pushed",
        direction: params["direction"] || "desc"
      ]

      case Client.list_user_repos(user.github_access_token, opts) do
        {:ok, repos} ->
          # Transform repos to include only needed fields
          simplified_repos =
            Enum.map(repos, fn repo ->
              %{
                id: repo["id"],
                name: repo["name"],
                full_name: repo["full_name"],
                description: repo["description"],
                owner: %{
                  login: repo["owner"]["login"],
                  avatar_url: repo["owner"]["avatar_url"]
                },
                html_url: repo["html_url"],
                private: repo["private"],
                stargazers_count: repo["stargazers_count"],
                language: repo["language"],
                pushed_at: repo["pushed_at"],
                created_at: repo["created_at"],
                updated_at: repo["updated_at"]
              }
            end)

          conn
          |> put_status(:ok)
          |> json(%{data: simplified_repos})

        {:error, reason} ->
          conn
          |> put_status(:bad_gateway)
          |> json(%{
            error: "github_api_error",
            message: "Failed to fetch repositories from GitHub",
            details: reason
          })
      end
    end
  end

  @doc """
  Gets complete details for a specific repository.
  Returns repo info, languages, topics, and README.
  """
  def show(conn, %{"owner" => owner, "repo" => repo}) do
    user = conn.assigns.current_user

    unless user.github_access_token do
      conn
      |> put_status(:unauthorized)
      |> json(%{
        error: "github_not_connected",
        message: "GitHub account not connected. Please reconnect your GitHub account."
      })
    else
      case Client.get_repo_details(user.github_access_token, owner, repo) do
        {:ok, details} ->
          # Transform to a simplified structure
          repo_data = details.repo

          response = %{
            id: repo_data["id"],
            name: repo_data["name"],
            full_name: repo_data["full_name"],
            description: repo_data["description"],
            owner: %{
              login: repo_data["owner"]["login"],
              avatar_url: repo_data["owner"]["avatar_url"]
            },
            html_url: repo_data["html_url"],
            homepage: repo_data["homepage"],
            private: repo_data["private"],
            stargazers_count: repo_data["stargazers_count"],
            watchers_count: repo_data["watchers_count"],
            forks_count: repo_data["forks_count"],
            language: repo_data["language"],
            languages: details.languages,
            topics: details.topics,
            readme: details.readme,
            pushed_at: repo_data["pushed_at"],
            created_at: repo_data["created_at"],
            updated_at: repo_data["updated_at"],
            size: repo_data["size"],
            default_branch: repo_data["default_branch"]
          }

          conn
          |> put_status(:ok)
          |> json(%{data: response})

        {:error, reason} ->
          conn
          |> put_status(:bad_gateway)
          |> json(%{
            error: "github_api_error",
            message: "Failed to fetch repository details from GitHub",
            details: reason
          })
      end
    end
  end

  # Helper function to parse integers with defaults
  defp parse_int(nil, default), do: default

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(value, _default) when is_integer(value), do: value
end
