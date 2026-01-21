defmodule Backend.Gigs do
  @moduledoc """
  The Gigs context - handles gig marketplace functionality.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Gigs.{Gig, Bid, GigReview}
  alias Backend.Social
  alias Backend.Catalog

  ## Gig Functions

  @doc """
  Returns a list of gigs with optional filters.
  """
  def list_gigs(opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)
    search = Keyword.get(opts, :search)
    tools = Keyword.get(opts, :tools, [])
    stacks = Keyword.get(opts, :stacks, [])
    status = Keyword.get(opts, :status, "open")
    min_budget = Keyword.get(opts, :min_budget)
    max_budget = Keyword.get(opts, :max_budget)
    sort_by = Keyword.get(opts, :sort_by, "newest")

    query =
      from g in Gig,
        join: u in assoc(g, :user),
        where: g.status == ^status,
        limit: ^limit,
        offset: ^offset,
        preload: [:user, :ai_tools, :tech_stacks]

    query =
      if search && search != "",
        do:
          where(
            query,
            [g],
            ilike(g.title, ^"%#{search}%") or ilike(g.description, ^"%#{search}%")
          ),
        else: query

    query =
      if min_budget,
        do: where(query, [g], g.budget_min >= ^min_budget or is_nil(g.budget_min)),
        else: query

    query =
      if max_budget,
        do: where(query, [g], g.budget_max <= ^max_budget or is_nil(g.budget_max)),
        else: query

    # Filter by tools if provided
    query =
      if tools != [] do
        from [g, u] in query,
          join: t in assoc(g, :ai_tools),
          where: t.slug in ^tools,
          distinct: true
      else
        query
      end

    # Filter by stacks if provided
    query =
      if stacks != [] do
        from [g, u] in query,
          join: s in assoc(g, :tech_stacks),
          where: s.slug in ^stacks,
          distinct: true
      else
        query
      end

    # Sort
    query =
      case sort_by do
        "budget_high" -> order_by(query, [g], desc: g.budget_max, desc: g.inserted_at)
        "budget_low" -> order_by(query, [g], asc: g.budget_min, desc: g.inserted_at)
        "bids" -> order_by(query, [g], desc: g.bids_count, desc: g.inserted_at)
        _ -> order_by(query, [g], desc: g.inserted_at)
      end

    Repo.all(query)
  end

  @doc """
  Gets a single gig with all associations.
  """
  def get_gig!(id) do
    case Repo.get(Gig, id) do
      nil ->
        {:error, :not_found}

      gig ->
        gig =
          gig
          |> Repo.preload([
            :user,
            :ai_tools,
            :tech_stacks,
            :bids,
            hired_bid: [:user]
          ])

        {:ok, gig}
    end
  end

  @doc """
  Creates a gig with associated tools and stacks.
  """
  def create_gig(user_id, attrs) do
    tools = Map.get(attrs, "tools", []) || Map.get(attrs, :tools, []) || []
    stacks = Map.get(attrs, "stacks", []) || Map.get(attrs, :stacks, []) || []

    Repo.transaction(fn ->
      # Create base gig
      gig_attrs =
        attrs
        |> Map.drop(["tools", :tools, "stacks", :stacks])
        |> Map.put("user_id", user_id)

      gig =
        case Repo.insert(Gig.changeset(%Gig{}, gig_attrs)) do
          {:ok, gig} -> gig
          {:error, changeset} -> Repo.rollback(changeset)
        end

      # Associate AI tools
      tool_records =
        tools
        |> Enum.map(fn tool_name ->
          slug = String.downcase(tool_name) |> String.replace(~r/[^a-z0-9]+/, "-")

          case Catalog.get_ai_tool_by_slug(slug) do
            nil ->
              {:ok, tool} = Repo.insert(%Backend.Catalog.AiTool{name: tool_name, slug: slug})
              tool

            tool ->
              tool
          end
        end)

      # Associate tech stacks
      stack_records =
        stacks
        |> Enum.map(fn stack_name ->
          slug = String.downcase(stack_name) |> String.replace(~r/[^a-z0-9]+/, "-")

          case Catalog.get_tech_stack_by_slug(slug) do
            nil ->
              {:ok, stack} =
                Repo.insert(%Backend.Catalog.TechStack{
                  name: stack_name,
                  slug: slug,
                  category: "other"
                })

              stack

            stack ->
              stack
          end
        end)

      # Update associations
      gig
      |> Repo.preload([:ai_tools, :tech_stacks])
      |> Ecto.Changeset.change()
      |> Ecto.Changeset.put_assoc(:ai_tools, tool_records)
      |> Ecto.Changeset.put_assoc(:tech_stacks, stack_records)
      |> Repo.update!()
      |> Repo.preload(:user)
    end)
  end

  @doc """
  Updates a gig (owner only, only while open).
  """
  def update_gig(gig_id, user_id, attrs) do
    case Repo.get(Gig, gig_id) do
      nil ->
        {:error, :not_found}

      %Gig{user_id: ^user_id, status: "open"} = gig ->
        gig
        |> Gig.changeset(attrs)
        |> Repo.update()

      %Gig{user_id: ^user_id} ->
        {:error, :cannot_edit_active_gig}

      %Gig{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Cancels a gig (owner only, only while open).
  """
  def cancel_gig(gig_id, user_id) do
    case Repo.get(Gig, gig_id) do
      nil ->
        {:error, :not_found}

      %Gig{user_id: ^user_id, status: "open"} = gig ->
        gig
        |> Gig.changeset(%{status: "cancelled"})
        |> Repo.update()

      %Gig{user_id: ^user_id} ->
        {:error, :gig_not_open}

      %Gig{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Completes a gig (owner only).
  """
  def complete_gig(gig_id, user_id) do
    case Repo.get(Gig, gig_id) |> Repo.preload(hired_bid: [:user]) do
      nil ->
        {:error, :not_found}

      %Gig{user_id: ^user_id, status: "in_progress", hired_bid: hired_bid} = gig ->
        result =
          gig
          |> Gig.changeset(%{status: "completed"})
          |> Repo.update()

        case result do
          {:ok, updated_gig} ->
            # Notify hired freelancer
            notify_gig_completed(updated_gig, hired_bid)
            {:ok, updated_gig}

          error ->
            error
        end

      %Gig{user_id: ^user_id, status: status} when status != "in_progress" ->
        {:error, :gig_not_in_progress}

      %Gig{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Lists gigs posted by a user.
  """
  def list_user_gigs(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from g in Gig,
        where: g.user_id == ^user_id,
        order_by: [desc: g.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:ai_tools, :tech_stacks]

    Repo.all(query)
  end

  ## Bid Functions

  @doc """
  Creates a bid on a gig.
  """
  def create_bid(gig_id, user_id, attrs) do
    gig = Repo.get(Gig, gig_id) |> Repo.preload(:user)

    cond do
      is_nil(gig) ->
        {:error, :gig_not_found}

      gig.user_id == user_id ->
        {:error, :cannot_bid_on_own_gig}

      gig.status != "open" ->
        {:error, :gig_not_open}

      true ->
        bid_attrs =
          attrs
          |> Map.put("gig_id", gig_id)
          |> Map.put("user_id", user_id)

        result =
          %Bid{}
          |> Bid.changeset(bid_attrs)
          |> Repo.insert()

        case result do
          {:ok, bid} ->
            # Increment bids counter
            from(g in Gig, where: g.id == ^gig_id)
            |> Repo.update_all(inc: [bids_count: 1])

            # Notify gig poster
            bid = Repo.preload(bid, :user)
            notify_bid_received(bid, gig)

            {:ok, bid}

          error ->
            error
        end
    end
  end

  @doc """
  Updates a bid (bidder only, only while pending).
  """
  def update_bid(bid_id, user_id, attrs) do
    case Repo.get(Bid, bid_id) do
      nil ->
        {:error, :not_found}

      %Bid{user_id: ^user_id, status: "pending"} = bid ->
        bid
        |> Bid.changeset(attrs)
        |> Repo.update()

      %Bid{user_id: ^user_id} ->
        {:error, :cannot_edit_bid}

      %Bid{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Withdraws a bid.
  """
  def withdraw_bid(bid_id, user_id) do
    case Repo.get(Bid, bid_id) |> Repo.preload(:gig) do
      nil ->
        {:error, :not_found}

      %Bid{user_id: ^user_id, status: "pending", gig: gig} = bid ->
        result =
          bid
          |> Bid.changeset(%{status: "withdrawn"})
          |> Repo.update()

        case result do
          {:ok, updated_bid} ->
            # Decrement bids counter
            from(g in Gig, where: g.id == ^gig.id)
            |> Repo.update_all(inc: [bids_count: -1])

            {:ok, updated_bid}

          error ->
            error
        end

      %Bid{user_id: ^user_id} ->
        {:error, :cannot_withdraw_bid}

      %Bid{} ->
        {:error, :unauthorized}
    end
  end

  @doc """
  Hires a bidder for a gig.
  """
  def hire_bid(gig_id, bid_id, user_id) do
    gig = Repo.get(Gig, gig_id) |> Repo.preload(:user)
    bid = Repo.get(Bid, bid_id) |> Repo.preload(:user)

    cond do
      is_nil(gig) ->
        {:error, :gig_not_found}

      is_nil(bid) ->
        {:error, :bid_not_found}

      gig.user_id != user_id ->
        {:error, :unauthorized}

      gig.status != "open" ->
        {:error, :gig_not_open}

      bid.gig_id != gig_id ->
        {:error, :bid_not_for_this_gig}

      bid.status != "pending" ->
        {:error, :bid_not_pending}

      true ->
        Repo.transaction(fn ->
          # Update bid to accepted
          {:ok, accepted_bid} =
            bid
            |> Bid.changeset(%{status: "accepted"})
            |> Repo.update()

          # Update gig status and hired_bid_id
          {:ok, updated_gig} =
            gig
            |> Gig.changeset(%{status: "in_progress", hired_bid_id: bid_id})
            |> Repo.update()

          # Reject all other pending bids
          from(b in Bid, where: b.gig_id == ^gig_id and b.id != ^bid_id and b.status == "pending")
          |> Repo.update_all(set: [status: "rejected"])

          # Notify accepted bidder
          notify_bid_accepted(accepted_bid, updated_gig)

          # Notify rejected bidders
          notify_bids_rejected(updated_gig, bid_id)

          Repo.preload(updated_gig, [:user, :ai_tools, :tech_stacks, hired_bid: [:user]],
            force: true
          )
        end)
    end
  end

  @doc """
  Lists bids for a gig.
  """
  def list_gig_bids(gig_id, user_id) do
    gig = Repo.get(Gig, gig_id)

    cond do
      is_nil(gig) ->
        {:error, :gig_not_found}

      gig.user_id == user_id ->
        # Poster can see all bids
        query =
          from b in Bid,
            where: b.gig_id == ^gig_id,
            order_by: [desc: b.inserted_at],
            preload: [:user]

        {:ok, Repo.all(query)}

      true ->
        # Others can only see their own bid
        query =
          from b in Bid,
            where: b.gig_id == ^gig_id and b.user_id == ^user_id,
            order_by: [desc: b.inserted_at],
            preload: [:user]

        {:ok, Repo.all(query)}
    end
  end

  @doc """
  Lists bids submitted by a user.
  """
  def list_user_bids(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from b in Bid,
        where: b.user_id == ^user_id,
        order_by: [desc: b.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [gig: [:user, :ai_tools, :tech_stacks]]

    Repo.all(query)
  end

  ## Review Functions

  @doc """
  Creates a review for a completed gig.
  """
  def create_review(gig_id, reviewer_id, attrs) do
    gig = Repo.get(Gig, gig_id) |> Repo.preload(hired_bid: [:user])

    cond do
      is_nil(gig) ->
        {:error, :gig_not_found}

      gig.status != "completed" ->
        {:error, :gig_not_completed}

      is_nil(gig.hired_bid) ->
        {:error, :no_hired_bid}

      gig.user_id != reviewer_id and gig.hired_bid.user_id != reviewer_id ->
        {:error, :unauthorized}

      true ->
        # Determine review type and reviewee
        {review_type, reviewee_id} =
          if gig.user_id == reviewer_id do
            {"client_to_freelancer", gig.hired_bid.user_id}
          else
            {"freelancer_to_client", gig.user_id}
          end

        review_attrs =
          attrs
          |> Map.put("gig_id", gig_id)
          |> Map.put("reviewer_id", reviewer_id)
          |> Map.put("reviewee_id", reviewee_id)
          |> Map.put("review_type", review_type)

        result =
          %GigReview{}
          |> GigReview.changeset(review_attrs)
          |> Repo.insert()

        case result do
          {:ok, review} ->
            # Notify reviewee
            review = Repo.preload(review, [:reviewer, :reviewee])
            notify_review_received(review)
            {:ok, review}

          error ->
            error
        end
    end
  end

  @doc """
  Gets reviews for a user.
  """
  def get_user_reviews(user_id, opts \\ []) do
    limit = Keyword.get(opts, :limit, 20)
    offset = Keyword.get(opts, :offset, 0)

    query =
      from r in GigReview,
        where: r.reviewee_id == ^user_id,
        order_by: [desc: r.inserted_at],
        limit: ^limit,
        offset: ^offset,
        preload: [:reviewer, :gig]

    Repo.all(query)
  end

  @doc """
  Gets reviews for a specific gig.
  """
  def get_gig_reviews(gig_id) do
    query =
      from r in GigReview,
        where: r.gig_id == ^gig_id,
        order_by: [desc: r.inserted_at],
        preload: [:reviewer, :reviewee]

    Repo.all(query)
  end

  @doc """
  Calculates average rating for a user.
  """
  def get_user_rating(user_id) do
    query =
      from r in GigReview,
        where: r.reviewee_id == ^user_id,
        select: %{
          average: avg(r.rating),
          count: count(r.id)
        }

    case Repo.one(query) do
      %{average: nil, count: 0} -> %{average: 0.0, count: 0}
      result -> %{average: Decimal.to_float(result.average), count: result.count}
    end
  end

  ## Private Notification Functions

  defp notify_bid_received(bid, gig) do
    Social.create_notification(%{
      type: "bid_received",
      user_id: gig.user_id,
      actor_id: bid.user_id,
      target_type: "Gig",
      target_id: gig.id,
      content_preview: String.slice(bid.proposal, 0, 100),
      read: false
    })
  end

  defp notify_bid_accepted(bid, gig) do
    Social.create_notification(%{
      type: "bid_accepted",
      user_id: bid.user_id,
      actor_id: gig.user_id,
      target_type: "Gig",
      target_id: gig.id,
      content_preview: gig.title,
      read: false
    })
  end

  defp notify_bids_rejected(gig, accepted_bid_id) do
    # Get all rejected bidders
    rejected_bids =
      from(b in Bid,
        where: b.gig_id == ^gig.id and b.id != ^accepted_bid_id and b.status == "rejected",
        select: b.user_id
      )
      |> Repo.all()

    # Notify each rejected bidder
    Enum.each(rejected_bids, fn user_id ->
      Social.create_notification(%{
        type: "bid_rejected",
        user_id: user_id,
        actor_id: gig.user_id,
        target_type: "Gig",
        target_id: gig.id,
        content_preview: gig.title,
        read: false
      })
    end)
  end

  defp notify_gig_completed(gig, hired_bid) do
    Social.create_notification(%{
      type: "gig_completed",
      user_id: hired_bid.user_id,
      actor_id: gig.user_id,
      target_type: "Gig",
      target_id: gig.id,
      content_preview: gig.title,
      read: false
    })
  end

  defp notify_review_received(review) do
    Social.create_notification(%{
      type: "review_received",
      user_id: review.reviewee_id,
      actor_id: review.reviewer_id,
      target_type: "Gig",
      target_id: review.gig_id,
      content_preview: String.slice(review.content || "", 0, 100),
      read: false
    })
  end
end
