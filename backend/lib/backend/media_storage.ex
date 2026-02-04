defmodule Backend.MediaStorage do
  @moduledoc "Handles image uploads to Cloudflare R2"

  @doc """
  Uploads a base64 data URI to R2 and returns the public URL.

  Options:
    - :path - The folder path prefix (default: "posts").
              Use "avatars" for user avatars, "banners" for user banners.
  """
  def upload_base64(data_uri, opts \\ [])

  def upload_base64(data_uri, opts) when is_binary(data_uri) do
    path = Keyword.get(opts, :path, "posts")

    # Only attempt upload if R2 is fully configured with a public URL
    case Application.get_env(:backend, :r2) do
      nil ->
        {:error, :r2_not_configured}

      config ->
        if config[:public_url] && config[:public_url] != "" do
          with {:ok, content_type, binary} <- parse_data_uri(data_uri),
               ext = extension_for_content_type(content_type),
               key = generate_key(path, ext),
               {:ok, _} <- upload_to_r2(key, binary, content_type) do
            {:ok, public_url(key)}
          end
        else
          {:error, :r2_public_url_not_configured}
        end
    end
  end

  def upload_base64(_, _), do: {:error, :invalid_input}

  def is_data_uri?(url), do: String.starts_with?(url || "", "data:")

  defp parse_data_uri("data:" <> rest) do
    case String.split(rest, ";base64,", parts: 2) do
      [content_type, base64_data] ->
        case Base.decode64(base64_data) do
          {:ok, binary} -> {:ok, content_type, binary}
          :error -> {:error, :invalid_base64}
        end

      _ ->
        {:error, :invalid_format}
    end
  end

  defp extension_for_content_type("image/jpeg"), do: "jpg"
  defp extension_for_content_type("image/png"), do: "png"
  defp extension_for_content_type("image/gif"), do: "gif"
  defp extension_for_content_type("image/webp"), do: "webp"
  defp extension_for_content_type(_), do: "bin"

  defp generate_key(path, ext) do
    uuid = Ecto.UUID.generate()
    "#{path}/#{uuid}.#{ext}"
  end

  defp upload_to_r2(key, binary, content_type) do
    case Application.get_env(:backend, :r2) do
      nil ->
        {:error, :r2_not_configured}

      config ->
        bucket = config[:bucket]

        ExAws.S3.put_object(bucket, key, binary,
          content_type: content_type,
          acl: :public_read
        )
        |> ExAws.request()
    end
  end

  defp public_url(key) do
    base_url = Application.get_env(:backend, :r2)[:public_url]
    "#{base_url}/#{key}"
  end
end
