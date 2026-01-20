defmodule Backend.GitHub.Client do
  @moduledoc """
  HTTP client for interacting with GitHub's REST API.
  """

  @base_url "https://api.github.com"

  @doc """
  Lists repositories for the authenticated user.

  Options:
    - `:per_page` - Number of results per page (default: 30, max: 100)
    - `:page` - Page number (default: 1)
    - `:sort` - Sort by: created, updated, pushed, full_name (default: pushed)
    - `:direction` - Sort direction: asc, desc (default: desc)
    - `:visibility` - Filter by visibility: all, public, private (default: all)
    - `:affiliation` - Filter by affiliation: owner, collaborator, organization_member (default: owner)
  """
  def list_user_repos(access_token, opts \\ []) do
    params = %{
      per_page: Keyword.get(opts, :per_page, 30),
      page: Keyword.get(opts, :page, 1),
      sort: Keyword.get(opts, :sort, "pushed"),
      direction: Keyword.get(opts, :direction, "desc"),
      visibility: Keyword.get(opts, :visibility, "all"),
      affiliation: Keyword.get(opts, :affiliation, "owner")
    }

    case Req.get("#{@base_url}/user/repos",
      params: params,
      headers: authorization_header(access_token)
    ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch repositories: #{inspect(error)}"}
    end
  end

  @doc """
  Gets a specific repository by owner and name.
  """
  def get_repo(access_token, owner, repo) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}",
      headers: authorization_header(access_token)
    ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: 404}} ->
        {:error, "Repository not found"}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch repository: #{inspect(error)}"}
    end
  end

  @doc """
  Gets the README content for a repository.
  Returns the decoded content as a string.
  """
  def get_readme(access_token, owner, repo) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}/readme",
      headers: authorization_header(access_token) ++ [{"Accept", "application/vnd.github.raw"}]
    ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: 404}} ->
        {:error, "README not found"}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch README: #{inspect(error)}"}
    end
  end

  @doc """
  Gets the language breakdown for a repository.
  Returns a map of language names to bytes of code.
  """
  def get_languages(access_token, owner, repo) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}/languages",
      headers: authorization_header(access_token)
    ) do
      {:ok, %{status: 200, body: body}} ->
        {:ok, body}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch languages: #{inspect(error)}"}
    end
  end

  @doc """
  Gets the topics for a repository.
  """
  def get_topics(access_token, owner, repo) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}/topics",
      headers: authorization_header(access_token) ++ [{"Accept", "application/vnd.github.mercy-preview+json"}]
    ) do
      {:ok, %{status: 200, body: %{"names" => names}}} ->
        {:ok, names}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch topics: #{inspect(error)}"}
    end
  end

  @doc """
  Gets complete repository details including README, languages, and topics.
  This is a convenience function that aggregates multiple API calls.
  """
  def get_repo_details(access_token, owner, repo) do
    with {:ok, repo_data} <- get_repo(access_token, owner, repo),
         {:ok, languages} <- get_languages(access_token, owner, repo),
         {:ok, topics} <- get_topics(access_token, owner, repo) do

      readme_result = get_readme(access_token, owner, repo)
      readme = case readme_result do
        {:ok, content} -> content
        {:error, _} -> nil
      end

      {:ok, %{
        repo: repo_data,
        languages: languages,
        topics: topics,
        readme: readme
      }}
    else
      {:error, reason} -> {:error, reason}
    end
  end

  # Image extensions supported by OpenAI's image API (jpeg, png, gif, webp)
  # Note: SVG and ICO are NOT supported
  @supported_image_extensions ~w(.png .jpg .jpeg .webp .gif)

  # Keywords that suggest a file is a logo/icon
  @logo_keywords ~w(logo icon favicon brand mark emblem symbol)

  @doc """
  Searches for logo/icon files in the repository by scanning the file tree.
  Returns a list of base64-encoded logo images (up to 3).
  """
  def find_logos(access_token, owner, repo) do
    require Logger
    Logger.info("Searching for logos in #{owner}/#{repo}")

    with {:ok, tree} <- get_repo_tree(access_token, owner, repo),
         logo_paths <- find_logo_paths(tree),
         {:ok, logos} <- fetch_logo_contents(access_token, owner, repo, logo_paths) do
      Logger.info("Logo search complete, found #{length(logos)} logo(s)")
      {:ok, logos}
    else
      {:error, reason} ->
        Logger.warning("Logo search failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc """
  Gets the full file tree for a repository.
  """
  def get_repo_tree(access_token, owner, repo) do
    # First get the default branch
    case get_repo(access_token, owner, repo) do
      {:ok, repo_data} ->
        default_branch = repo_data["default_branch"] || "main"
        fetch_tree(access_token, owner, repo, default_branch)

      {:error, reason} ->
        {:error, reason}
    end
  end

  defp fetch_tree(access_token, owner, repo, branch) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}/git/trees/#{branch}",
      params: %{recursive: "1"},
      headers: authorization_header(access_token)
    ) do
      {:ok, %{status: 200, body: %{"tree" => tree}}} ->
        {:ok, tree}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch tree: #{inspect(error)}"}
    end
  end

  defp find_logo_paths(tree) do
    require Logger

    # Filter for image files
    image_files =
      tree
      |> Enum.filter(fn item ->
        item["type"] == "blob" && is_image_file?(item["path"])
      end)

    # Score and sort by likelihood of being a logo
    scored_files =
      image_files
      |> Enum.map(fn item ->
        path = item["path"]
        score = calculate_logo_score(path)
        {path, score}
      end)
      |> Enum.filter(fn {_path, score} -> score > 0 end)
      |> Enum.sort_by(fn {_path, score} -> score end, :desc)
      |> Enum.take(5)

    Logger.info("Found #{length(scored_files)} potential logo files: #{inspect(Enum.map(scored_files, &elem(&1, 0)))}")

    Enum.map(scored_files, &elem(&1, 0))
  end

  defp is_image_file?(path) do
    ext = Path.extname(path) |> String.downcase()
    ext in @supported_image_extensions
  end

  defp calculate_logo_score(path) do
    filename = Path.basename(path) |> String.downcase()
    dirname = Path.dirname(path) |> String.downcase()

    # Check if filename contains logo keywords
    keyword_score =
      @logo_keywords
      |> Enum.reduce(0, fn keyword, acc ->
        cond do
          # Exact match (e.g., "logo.png") - highest score
          String.starts_with?(filename, keyword <> ".") -> acc + 100
          # Contains keyword (e.g., "my-logo.png", "logo-dark.svg")
          String.contains?(filename, keyword) -> acc + 50
          # Directory contains keyword (e.g., "icons/app.png")
          String.contains?(dirname, keyword) -> acc + 10
          true -> acc
        end
      end)

    # Bonus for being in root or common asset directories
    location_score =
      cond do
        # Root level
        !String.contains?(path, "/") -> 20
        # Common asset directories
        String.contains?(dirname, "public") -> 15
        String.contains?(dirname, "assets") -> 15
        String.contains?(dirname, "static") -> 15
        String.contains?(dirname, "images") -> 10
        String.contains?(dirname, "img") -> 10
        String.contains?(dirname, ".github") -> 10
        true -> 0
      end

    # Prefer PNG over other formats (SVG/ICO not supported by OpenAI)
    format_score =
      case Path.extname(path) |> String.downcase() do
        ".png" -> 10
        ".webp" -> 8
        ".gif" -> 5
        ".jpg" -> 3
        ".jpeg" -> 3
        _ -> 0
      end

    keyword_score + location_score + format_score
  end

  defp fetch_logo_contents(access_token, owner, repo, paths) do
    require Logger

    logos =
      paths
      |> Enum.take(3)  # Limit to 3 logos
      |> Enum.reduce_while([], fn path, acc ->
        case get_file_content(access_token, owner, repo, path) do
          {:ok, {content, mime_type}} ->
            Logger.info("Fetched logo: #{path} (#{mime_type})")
            {:cont, [{content, mime_type} | acc]}
          {:error, reason} ->
            Logger.warning("Failed to fetch #{path}: #{reason}")
            {:cont, acc}
        end
      end)
      |> Enum.reverse()

    if length(logos) > 0 do
      {:ok, logos}
    else
      {:error, "No logos could be fetched"}
    end
  end

  @doc """
  Gets the raw content of a file from the repository.
  Returns a tuple of {base64_content, mime_type}.
  """
  def get_file_content(access_token, owner, repo, path) do
    case Req.get("#{@base_url}/repos/#{owner}/#{repo}/contents/#{path}",
      headers: authorization_header(access_token)
    ) do
      {:ok, %{status: 200, body: %{"content" => content, "encoding" => "base64"}}} ->
        # GitHub returns base64 with newlines, clean it up
        clean_content = content |> String.replace("\n", "") |> String.trim()
        mime_type = get_mime_type(path)
        {:ok, {clean_content, mime_type}}

      {:ok, %{status: 404}} ->
        {:error, "File not found"}

      {:ok, %{status: status, body: body}} ->
        {:error, "GitHub API returned status #{status}: #{inspect(body)}"}

      {:error, error} ->
        {:error, "Failed to fetch file: #{inspect(error)}"}
    end
  end

  defp get_mime_type(path) do
    case Path.extname(path) |> String.downcase() do
      ".png" -> "image/png"
      ".jpg" -> "image/jpeg"
      ".jpeg" -> "image/jpeg"
      ".gif" -> "image/gif"
      ".webp" -> "image/webp"
      _ -> "application/octet-stream"
    end
  end

  # Private helper functions

  defp authorization_header(access_token) do
    [
      {"Authorization", "Bearer #{access_token}"},
      {"Accept", "application/vnd.github.v3+json"},
      {"User-Agent", "Vibeslop"}
    ]
  end
end
