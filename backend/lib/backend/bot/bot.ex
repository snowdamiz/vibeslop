defmodule Backend.Bot do
  @moduledoc """
  The Bot context - handles bot user and bot posts.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts.User
  alias Backend.Content.Post
  alias Backend.Bot.BotPost

  # Fixed UUID for the bot user
  @bot_user_id "00000000-0000-0000-0000-000000000001"

  @doc """
  Returns the bot user ID.
  """
  def bot_user_id, do: @bot_user_id

  @doc """
  Returns the bot user.
  """
  def get_bot_user do
    Repo.get(User, @bot_user_id)
  end

  @doc """
  Returns the bot user, raising if not found.
  """
  def get_bot_user! do
    Repo.get!(User, @bot_user_id)
  end

  @doc """
  Creates a bot post with associated metadata.

  ## Parameters
  - bot_type: The type of bot post ("trending_projects", "milestone", "announcement")
  - content: The text content for the post
  - metadata: Additional data specific to the bot type (e.g., project_ids for trending)

  ## Returns
  - {:ok, post} on success
  - {:error, changeset} on failure
  """
  def create_bot_post(bot_type, content, metadata \\ %{}) do
    bot_user = get_bot_user!()

    Repo.transaction(fn ->
      # Create the post
      post_changeset =
        Post.changeset(%Post{}, %{
          user_id: bot_user.id,
          content: content
        })

      case Repo.insert(post_changeset) do
        {:ok, post} ->
          # Create the bot_post metadata
          bot_post_changeset =
            BotPost.changeset(%BotPost{}, %{
              post_id: post.id,
              bot_type: bot_type,
              metadata: metadata
            })

          case Repo.insert(bot_post_changeset) do
            {:ok, _bot_post} ->
              # Return the post with preloaded associations
              Repo.preload(post, [:user])

            {:error, changeset} ->
              Repo.rollback(changeset)
          end

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc """
  Gets the bot post metadata for a given post ID.
  """
  def get_bot_post(post_id) do
    Repo.get_by(BotPost, post_id: post_id)
  end

  @doc """
  Checks if a post is a bot post.
  """
  def is_bot_post?(post_id) do
    from(bp in BotPost, where: bp.post_id == ^post_id, select: count(bp.id))
    |> Repo.one()
    |> Kernel.>(0)
  end

  @doc """
  Checks if a user is the system bot.
  """
  def is_bot_user?(user_id) do
    user_id == @bot_user_id
  end

  @doc """
  Lists all bot posts with pagination.

  ## Options
  - :limit - Number of results (default 20)
  - :offset - Offset for pagination (default 0)

  ## Returns
  A list of bot posts with their associated posts preloaded.
  """
  def list_bot_posts(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    from(bp in BotPost,
      join: p in Post,
      on: bp.post_id == p.id,
      order_by: [desc: p.inserted_at],
      limit: ^limit,
      offset: ^offset,
      preload: [post: {p, :user}]
    )
    |> Repo.all()
  end

  @doc """
  Counts total bot posts.
  """
  def count_bot_posts do
    Repo.aggregate(BotPost, :count, :id)
  end

  @doc """
  Deletes a bot post and its associated post.

  ## Returns
  - {:ok, bot_post} on success
  - {:error, :not_found} if the bot post doesn't exist
  """
  def delete_bot_post(bot_post_id) do
    case Repo.get(BotPost, bot_post_id) do
      nil ->
        {:error, :not_found}

      bot_post ->
        post = Repo.get!(Post, bot_post.post_id)

        Repo.transaction(fn ->
          Repo.delete!(bot_post)
          Repo.delete!(post)
          bot_post
        end)
    end
  end
end
