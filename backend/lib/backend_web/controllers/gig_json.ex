defmodule BackendWeb.GigJSON do
  alias Backend.Gigs.{Gig, Bid, GigReview}

  @doc """
  Renders a list of gigs.
  """
  def index(%{gigs: gigs}) do
    %{data: for(gig <- gigs, do: data(gig))}
  end

  @doc """
  Renders a single gig.
  """
  def show(%{gig: gig}) do
    %{data: data(gig)}
  end

  @doc """
  Renders a list of bids.
  """
  def bids(%{bids: bids}) do
    %{data: for(bid <- bids, do: bid_data(bid))}
  end

  @doc """
  Renders a list of bids with gig info (for my_bids).
  """
  def my_bids(%{bids: bids}) do
    %{data: for(bid <- bids, do: bid_with_gig_data(bid))}
  end

  @doc """
  Renders a single bid.
  """
  def bid(%{bid: bid}) do
    %{data: bid_data(bid)}
  end

  @doc """
  Renders a list of reviews.
  """
  def reviews(%{reviews: reviews}) do
    %{data: for(review <- reviews, do: review_data(review))}
  end

  @doc """
  Renders a single review.
  """
  def review(%{review: review}) do
    %{data: review_data(review)}
  end

  defp data(%Gig{} = gig) do
    %{
      id: gig.id,
      title: gig.title,
      description: gig.description,
      budget_min: gig.budget_min,
      budget_max: gig.budget_max,
      currency: gig.currency,
      deadline: gig.deadline,
      status: gig.status,
      bids_count: gig.bids_count,
      views_count: gig.views_count,
      user: user_data(gig.user),
      hired_bid:
        if(Ecto.assoc_loaded?(gig.hired_bid) && gig.hired_bid,
          do: bid_data(gig.hired_bid),
          else: nil
        ),
      skills:
        if(Ecto.assoc_loaded?(gig.ai_tools), do: Enum.map(gig.ai_tools, & &1.slug), else: []),
      stacks:
        if(Ecto.assoc_loaded?(gig.tech_stacks),
          do: Enum.map(gig.tech_stacks, & &1.slug),
          else: []
        ),
      inserted_at: gig.inserted_at,
      updated_at: gig.updated_at
    }
  end

  defp bid_data(%Bid{} = bid) do
    %{
      id: bid.id,
      amount: bid.amount,
      currency: bid.currency,
      delivery_days: bid.delivery_days,
      proposal: bid.proposal,
      status: bid.status,
      user: if(Ecto.assoc_loaded?(bid.user), do: user_data(bid.user), else: nil),
      inserted_at: bid.inserted_at,
      updated_at: bid.updated_at
    }
  end

  defp bid_with_gig_data(%Bid{} = bid) do
    bid_data(bid)
    |> Map.put(:gig, if(Ecto.assoc_loaded?(bid.gig), do: data(bid.gig), else: nil))
  end

  defp review_data(%GigReview{} = review) do
    %{
      id: review.id,
      rating: review.rating,
      content: review.content,
      review_type: review.review_type,
      reviewer:
        if(Ecto.assoc_loaded?(review.reviewer), do: user_data(review.reviewer), else: nil),
      reviewee:
        if(Ecto.assoc_loaded?(review.reviewee), do: user_data(review.reviewee), else: nil),
      gig_id: review.gig_id,
      inserted_at: review.inserted_at
    }
  end

  defp user_data(nil), do: nil

  defp user_data(user) do
    %{
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      bio: user.bio,
      developer_score: Map.get(user, :developer_score),
      is_verified: user.is_verified,
      is_premium: Backend.Billing.premium?(user)
    }
  end
end
