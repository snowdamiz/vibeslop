defmodule Backend.AI.ContentModeration do
  @moduledoc """
  AI-powered content moderation for detecting NSFW images.
  Uses ByteDance Seed 1.6 Flash via OpenRouter for vision analysis.

  IMPORTANT: This module uses FAIL-CLOSED design - if we cannot verify
  an image is safe, it will be rejected. This prevents NSFW content
  from slipping through due to API errors or parsing failures.
  """

  alias Backend.AI.OpenRouter
  require Logger

  @moderation_model "bytedance-seed/seed-1.6-flash"

  @moderation_prompt """
  You are a content moderation system. Analyze this image and determine if it contains NSFW (Not Safe For Work) content.

  NSFW content includes:
  - Nudity or sexual content
  - Graphic violence or gore
  - Disturbing or shocking imagery
  - Drug use imagery
  - Hate symbols or extremist content

  Respond with ONLY a JSON object in this exact format:
  {"safe": true} if the image is safe
  {"safe": false, "reason": "brief description"} if the image is NSFW

  Do not include any other text, only the JSON object.
  """

  @doc """
  Moderates an image for NSFW content.

  Takes a base64-encoded image (with or without data URI prefix) and returns:
  - `{:ok, :safe}` if the image is explicitly determined to be safe
  - `{:error, :nsfw, reason}` if the image contains NSFW content or cannot be verified

  Uses fail-closed design: if moderation fails or response cannot be parsed,
  the image is rejected to prevent NSFW content from slipping through.
  """
  def moderate_image(image_data) when is_binary(image_data) do
    Logger.info("Starting content moderation check")

    case OpenRouter.vision_analysis(image_data, @moderation_prompt, model: @moderation_model) do
      {:ok, response} ->
        parse_moderation_response(response)

      {:error, reason} ->
        Logger.error("Content moderation API failed: #{inspect(reason)}")
        # FAIL-CLOSED: reject if we can't verify safety
        {:error, :nsfw, "Unable to verify image safety. Please try again."}
    end
  end

  defp parse_moderation_response(response) do
    # Extract text content from response
    case OpenRouter.extract_text(response) do
      {:ok, text} ->
        parse_moderation_text(text)

      {:error, _} ->
        Logger.warning("Failed to extract text from moderation response")
        # FAIL-CLOSED: reject if we can't parse the response
        {:error, :nsfw, "Unable to verify image safety. Please try again."}
    end
  end

  defp parse_moderation_text(text) when is_binary(text) do
    text = String.trim(text)

    # Reject empty responses
    if text == "" do
      Logger.warning("Content moderation returned empty response")
      {:error, :nsfw, "Unable to verify image safety. Please try again."}
    else
      parse_moderation_json(text)
    end
  end

  defp parse_moderation_text(nil) do
    Logger.warning("Content moderation returned nil response")
    {:error, :nsfw, "Unable to verify image safety. Please try again."}
  end

  defp parse_moderation_json(text) do
    # Handle markdown code blocks if present
    text =
      text
      |> String.replace(~r/```json\s*/, "")
      |> String.replace(~r/```\s*$/, "")
      |> String.trim()

    case Jason.decode(text) do
      {:ok, %{"safe" => true}} ->
        Logger.info("Content moderation passed: image is safe")
        {:ok, :safe}

      {:ok, %{"safe" => false, "reason" => reason}} ->
        Logger.info("Content moderation failed: #{reason}")
        {:error, :nsfw, reason}

      {:ok, %{"safe" => false}} ->
        Logger.info("Content moderation failed: NSFW content detected")
        {:error, :nsfw, "Content policy violation"}

      {:error, _} ->
        # If we can't parse the JSON, check for keywords
        check_keywords(text)
    end
  end

  defp check_keywords(text) do
    downcased = String.downcase(text)

    cond do
      # If response contains NSFW indicators, reject
      String.contains?(downcased, ["nsfw", "unsafe", "not safe", "inappropriate", "nudity", "sexual", "violence"]) ->
        Logger.info("Content moderation failed: detected NSFW keywords in response")
        {:error, :nsfw, "Content policy violation"}

      # Only allow if we see EXPLICIT safety confirmation
      String.contains?(downcased, ["safe", "appropriate", "acceptable", "sfw", "clean"]) and
      not String.contains?(downcased, ["not safe", "unsafe"]) ->
        Logger.info("Content moderation passed: detected safe keywords")
        {:ok, :safe}

      # FAIL-CLOSED: If we can't determine, reject
      true ->
        Logger.warning("Could not parse moderation response, rejecting: #{String.slice(text, 0, 100)}")
        {:error, :nsfw, "Unable to verify image safety. Please try again."}
    end
  end
end
