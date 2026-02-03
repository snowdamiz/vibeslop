defmodule Backend.AI.ColorExtractor do
  @moduledoc """
  Extracts project-specific brand colors from logos and README content.
  Uses AI vision analysis for logo color detection and regex parsing for README colors.
  """

  alias Backend.AI.OpenRouter

  @type color_result :: %{
          primary: String.t() | nil,
          secondary: String.t() | nil,
          accent: String.t() | nil,
          palette: [String.t()],
          source: :logo | :readme | nil
        }

  @doc """
  Main entry point for color extraction.
  Attempts to extract colors from logos first, then falls back to README parsing.

  Returns {:ok, color_result()} with detected colors, or {:ok, empty_result()} if none found.
  """
  @spec extract_project_colors(list(), String.t() | nil) :: {:ok, color_result()}
  def extract_project_colors(logos, readme) do
    require Logger

    # Try logo extraction first (highest priority)
    case extract_colors_from_logos(logos) do
      {:ok, colors} when colors != [] ->
        Logger.info("Extracted #{length(colors)} colors from logo")
        {:ok, build_color_result(colors, :logo)}

      _ ->
        # Fall back to README parsing
        case extract_colors_from_readme(readme) do
          colors when colors != [] ->
            Logger.info("Extracted #{length(colors)} colors from README")
            {:ok, build_color_result(colors, :readme)}

          [] ->
            Logger.info("No colors detected from logos or README")
            {:ok, empty_result()}
        end
    end
  end

  @doc """
  Extracts colors from logos using AI vision analysis.
  Analyzes the first logo found (assumes it's the primary brand logo).
  """
  @spec extract_colors_from_logos(list()) :: {:ok, [String.t()]} | {:error, term()}
  def extract_colors_from_logos([]), do: {:ok, []}

  def extract_colors_from_logos([{base64, _mime_type} | _rest]) do
    extract_colors_from_logos([base64])
  end

  def extract_colors_from_logos([logo_base64 | _rest]) when is_binary(logo_base64) do
    require Logger

    prompt = """
    Analyze this logo and identify the 3-5 most prominent brand colors.
    Return ONLY a JSON array of hex color codes, nothing else.
    Example: ["#FF5733", "#3498DB", "#2ECC71"]
    Ignore white (#FFFFFF) and black (#000000) backgrounds - focus on the actual brand colors.
    If no clear brand colors are visible, return an empty array: []
    """

    case OpenRouter.vision_analysis(logo_base64, prompt) do
      {:ok, response} ->
        case OpenRouter.extract_text(response) do
          {:ok, text} ->
            parse_color_array(text)

          {:error, reason} ->
            Logger.warning("Failed to extract text from vision response: #{inspect(reason)}")
            {:error, reason}
        end

      {:error, reason} ->
        Logger.warning("Logo vision analysis failed: #{inspect(reason)}")
        {:error, reason}
    end
  end

  @doc """
  Parses README content for hex color codes.
  Looks for shields.io badge colors, explicit hex mentions, and CSS-style colors.
  """
  @spec extract_colors_from_readme(String.t() | nil) :: [String.t()]
  def extract_colors_from_readme(nil), do: []
  def extract_colors_from_readme(""), do: []

  def extract_colors_from_readme(readme) when is_binary(readme) do
    patterns = [
      # shields.io badge colors: ?color=3498DB or ?labelColor=FF5733
      ~r/[?&](?:color|labelColor)=([0-9A-Fa-f]{6})\b/,
      # shields.io badge colors with hash: ?color=%233498DB
      ~r/[?&](?:color|labelColor)=%23([0-9A-Fa-f]{6})\b/,
      # Explicit mentions: "brand color: #FF5733" or "primary: #3498DB"
      ~r/(?:brand|primary|main|theme)\s*(?:color)?[:\s]+#([0-9A-Fa-f]{6})\b/i,
      # CSS-style: background-color: #FF5733 or color: #3498DB
      ~r/(?:background-)?color:\s*#([0-9A-Fa-f]{6})\b/i,
      # Standalone hex codes in markdown (e.g., `#3498DB`)
      ~r/`#([0-9A-Fa-f]{6})`/
    ]

    colors =
      patterns
      |> Enum.flat_map(fn pattern ->
        Regex.scan(pattern, readme)
        |> Enum.map(fn [_match, hex] -> normalize_hex(hex) end)
      end)
      |> Enum.uniq()
      |> filter_meaningful_colors()
      |> Enum.take(5)

    colors
  end

  # Private functions

  defp parse_color_array(text) do
    # Clean up the response - remove markdown code blocks if present
    cleaned =
      text
      |> String.trim()
      |> String.replace(~r/^```json\s*/m, "")
      |> String.replace(~r/^```\s*/m, "")
      |> String.replace(~r/```$/m, "")
      |> String.trim()

    case Jason.decode(cleaned) do
      {:ok, colors} when is_list(colors) ->
        valid_colors =
          colors
          |> Enum.filter(&valid_hex_color?/1)
          |> Enum.map(&normalize_hex/1)
          |> filter_meaningful_colors()

        {:ok, valid_colors}

      {:ok, _} ->
        {:error, "Expected array of colors"}

      {:error, _reason} ->
        # Try to extract hex colors from the text as fallback
        hex_pattern = ~r/#([0-9A-Fa-f]{6})\b/
        colors =
          Regex.scan(hex_pattern, cleaned)
          |> Enum.map(fn [_match, hex] -> normalize_hex(hex) end)
          |> filter_meaningful_colors()

        {:ok, colors}
    end
  end

  defp valid_hex_color?(color) when is_binary(color) do
    # Match both #RRGGBB and RRGGBB formats
    Regex.match?(~r/^#?[0-9A-Fa-f]{6}$/, color)
  end

  defp valid_hex_color?(_), do: false

  defp normalize_hex(hex) do
    # Ensure the hex code starts with # and is uppercase
    hex
    |> String.trim_leading("#")
    |> String.upcase()
    |> then(&"##{&1}")
  end

  defp filter_meaningful_colors(colors) do
    # Filter out very light colors (near white) and very dark colors (near black)
    # These are usually backgrounds, not brand colors
    Enum.reject(colors, fn hex ->
      {r, g, b} = hex_to_rgb(hex)

      # Filter out near-white (all channels > 240)
      near_white = r > 240 and g > 240 and b > 240
      # Filter out near-black (all channels < 15)
      near_black = r < 15 and g < 15 and b < 15
      # Filter out pure grays (all channels within 10 of each other and in the extremes)
      pure_gray = abs(r - g) < 10 and abs(g - b) < 10 and (r > 230 or r < 25)

      near_white or near_black or pure_gray
    end)
  end

  defp hex_to_rgb(hex) do
    hex_clean = String.trim_leading(hex, "#")

    {r, _} = Integer.parse(String.slice(hex_clean, 0, 2), 16)
    {g, _} = Integer.parse(String.slice(hex_clean, 2, 2), 16)
    {b, _} = Integer.parse(String.slice(hex_clean, 4, 2), 16)

    {r, g, b}
  end

  defp build_color_result(colors, source) do
    %{
      primary: Enum.at(colors, 0),
      secondary: Enum.at(colors, 1),
      accent: Enum.at(colors, 2),
      palette: colors,
      source: source
    }
  end

  defp empty_result do
    %{
      primary: nil,
      secondary: nil,
      accent: nil,
      palette: [],
      source: nil
    }
  end
end
