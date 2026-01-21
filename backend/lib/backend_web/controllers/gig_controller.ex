defmodule BackendWeb.GigController do
  use BackendWeb, :controller

  alias Backend.Gigs

  action_fallback BackendWeb.FallbackController

  # List gigs (public with optional filters)
  def index(conn, params) do
    limit = parse_int(Map.get(params, "limit", "20"), 20)
    offset = parse_int(Map.get(params, "offset", "0"), 0)
    search = Map.get(params, "search")
    tools = Map.get(params, "tools", [])
    stacks = Map.get(params, "stacks", [])
    status = Map.get(params, "status", "open")
    min_budget = parse_int(Map.get(params, "min_budget"), nil)
    max_budget = parse_int(Map.get(params, "max_budget"), nil)
    sort_by = Map.get(params, "sort_by", "newest")

    gigs =
      Gigs.list_gigs(
        limit: limit,
        offset: offset,
        search: search,
        tools: tools,
        stacks: stacks,
        status: status,
        min_budget: min_budget,
        max_budget: max_budget,
        sort_by: sort_by
      )

    render(conn, :index, gigs: gigs)
  end

  # Show single gig (public)
  def show(conn, %{"id" => id}) do
    case Ecto.UUID.cast(id) do
      {:ok, _uuid} ->
        case Gigs.get_gig!(id) do
          {:ok, gig} ->
            render(conn, :show, gig: gig)

          {:error, :not_found} ->
            conn
            |> put_status(:not_found)
            |> put_view(json: BackendWeb.ErrorJSON)
            |> render(:"404")
        end

      :error ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")
    end
  end

  # Create gig (authenticated)
  def create(conn, %{"gig" => gig_params}) do
    current_user = conn.assigns[:current_user]

    with {:ok, gig} <- Gigs.create_gig(current_user.id, gig_params) do
      conn
      |> put_status(:created)
      |> render(:show, gig: gig)
    end
  end

  # Update gig (owner only)
  def update(conn, %{"id" => id, "gig" => gig_params}) do
    current_user = conn.assigns[:current_user]

    case Gigs.update_gig(id, current_user.id, gig_params) do
      {:ok, gig} ->
        gig = Backend.Repo.preload(gig, [:user, :ai_tools, :tech_stacks])
        render(conn, :show, gig: gig)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, :cannot_edit_active_gig} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Cannot edit gig that is not open"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # Cancel gig (owner only)
  def cancel(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Gigs.cancel_gig(id, current_user.id) do
      {:ok, gig} ->
        gig = Backend.Repo.preload(gig, [:user, :ai_tools, :tech_stacks])
        render(conn, :show, gig: gig)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, :gig_not_open} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Gig is not open"})
    end
  end

  # Hire a bidder (owner only)
  def hire(conn, %{"id" => id, "bid_id" => bid_id}) do
    current_user = conn.assigns[:current_user]

    case Gigs.hire_bid(id, bid_id, current_user.id) do
      {:ok, gig} ->
        render(conn, :show, gig: gig)

      {:error, :gig_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Gig not found"})

      {:error, :bid_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Bid not found"})

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, reason} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: error_message(reason)})
    end
  end

  # Complete gig (owner only)
  def complete(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Gigs.complete_gig(id, current_user.id) do
      {:ok, gig} ->
        gig = Backend.Repo.preload(gig, [:user, :ai_tools, :tech_stacks, hired_bid: [:user]])
        render(conn, :show, gig: gig)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"404")

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, :gig_not_in_progress} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Gig is not in progress"})
    end
  end

  # List bids for a gig
  def bids(conn, %{"id" => id}) do
    current_user = conn.assigns[:current_user]

    case Gigs.list_gig_bids(id, current_user.id) do
      {:ok, bids} ->
        render(conn, :bids, bids: bids)

      {:error, :gig_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Gig not found"})
    end
  end

  # Submit a bid (authenticated, not owner)
  def bid(conn, %{"id" => id, "bid" => bid_params}) do
    current_user = conn.assigns[:current_user]

    case Gigs.create_bid(id, current_user.id, bid_params) do
      {:ok, bid} ->
        conn
        |> put_status(:created)
        |> render(:bid, bid: bid)

      {:error, :gig_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Gig not found"})

      {:error, reason} when is_atom(reason) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: error_message(reason)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # Update a bid (bidder only)
  def update_bid(conn, %{"id" => _gig_id, "bid_id" => bid_id, "bid" => bid_params}) do
    current_user = conn.assigns[:current_user]

    case Gigs.update_bid(bid_id, current_user.id, bid_params) do
      {:ok, bid} ->
        bid = Backend.Repo.preload(bid, :user)
        render(conn, :bid, bid: bid)

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Bid not found"})

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, :cannot_edit_bid} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Cannot edit bid that is not pending"})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # Withdraw a bid (bidder only)
  def withdraw_bid(conn, %{"id" => _gig_id, "bid_id" => bid_id}) do
    current_user = conn.assigns[:current_user]

    case Gigs.withdraw_bid(bid_id, current_user.id) do
      {:ok, _bid} ->
        conn
        |> put_status(:no_content)
        |> send_resp(:no_content, "")

      {:error, :not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Bid not found"})

      {:error, :unauthorized} ->
        conn
        |> put_status(:forbidden)
        |> put_view(json: BackendWeb.ErrorJSON)
        |> render(:"403")

      {:error, :cannot_withdraw_bid} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "Cannot withdraw bid that is not pending"})
    end
  end

  # Create review (authenticated, only after completion)
  def review(conn, %{"id" => id, "review" => review_params}) do
    current_user = conn.assigns[:current_user]

    case Gigs.create_review(id, current_user.id, review_params) do
      {:ok, review} ->
        conn
        |> put_status(:created)
        |> render(:review, review: review)

      {:error, :gig_not_found} ->
        conn
        |> put_status(:not_found)
        |> json(%{error: "Gig not found"})

      {:error, reason} when is_atom(reason) ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: error_message(reason)})

      {:error, changeset} ->
        conn
        |> put_status(:unprocessable_entity)
        |> put_view(json: BackendWeb.ChangesetJSON)
        |> render(:error, changeset: changeset)
    end
  end

  # List reviews for a gig (public)
  def reviews(conn, %{"id" => id}) do
    reviews = Gigs.get_gig_reviews(id)
    render(conn, :reviews, reviews: reviews)
  end

  # List user's posted gigs
  def my_gigs(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = parse_int(Map.get(params, "limit", "20"), 20)
    offset = parse_int(Map.get(params, "offset", "0"), 0)

    gigs = Gigs.list_user_gigs(current_user.id, limit: limit, offset: offset)
    render(conn, :index, gigs: gigs)
  end

  # List user's submitted bids
  def my_bids(conn, params) do
    current_user = conn.assigns[:current_user]
    limit = parse_int(Map.get(params, "limit", "20"), 20)
    offset = parse_int(Map.get(params, "offset", "0"), 0)

    bids = Gigs.list_user_bids(current_user.id, limit: limit, offset: offset)
    render(conn, :my_bids, bids: bids)
  end

  # Helper functions

  defp parse_int(value, default) when is_binary(value) do
    case Integer.parse(value) do
      {int, _} -> int
      :error -> default
    end
  end

  defp parse_int(value, _default) when is_integer(value), do: value
  defp parse_int(_, default), do: default

  defp error_message(:cannot_bid_on_own_gig), do: "Cannot bid on your own gig"
  defp error_message(:gig_not_open), do: "Gig is not open for bids"
  defp error_message(:gig_not_completed), do: "Gig is not completed yet"
  defp error_message(:no_hired_bid), do: "No hired bid for this gig"
  defp error_message(:unauthorized), do: "Unauthorized"
  defp error_message(:bid_not_for_this_gig), do: "Bid is not for this gig"
  defp error_message(:bid_not_pending), do: "Bid is not pending"
  defp error_message(reason), do: "Error: #{reason}"
end
