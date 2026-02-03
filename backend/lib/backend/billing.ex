defmodule Backend.Billing do
  @moduledoc """
  The Billing context - handles Stripe subscription management.

  Manages premium subscriptions including:
  - Creating Stripe checkout sessions
  - Managing Stripe Customer Portal sessions
  - Processing webhook events for subscription lifecycle
  - Checking premium status

  Admin users automatically have premium status.
  """

  import Ecto.Query, warn: false
  alias Backend.Repo
  alias Backend.Accounts
  alias Backend.Accounts.User

  @premium_price_id Application.compile_env(:backend, :stripe_premium_price_id, "price_placeholder")

  # ============================================================================
  # Premium Status
  # ============================================================================

  @doc """
  Checks if a user has an active premium subscription.
  Admin users automatically have premium status.
  """
  def premium?(nil), do: false

  def premium?(%User{subscription_status: status} = user) do
    Accounts.is_admin?(user) || status in ["active", "trialing"]
  end

  def premium?(user_id) when is_binary(user_id) do
    case Repo.get(User, user_id) do
      nil -> false
      user -> premium?(user)
    end
  end

  @doc """
  Returns the subscription info for a user.
  """
  def get_subscription_info(%User{} = user) do
    %{
      status: user.subscription_status || "free",
      is_premium: premium?(user),
      current_period_end: user.subscription_current_period_end,
      stripe_customer_id: user.stripe_customer_id
    }
  end

  # ============================================================================
  # Stripe Checkout
  # ============================================================================

  @doc """
  Creates a Stripe Checkout session for premium subscription.
  """
  def create_checkout_session(%User{} = user, success_url, cancel_url) do
    # Ensure user has a Stripe customer
    {:ok, user} = ensure_stripe_customer(user)

    price_id = get_premium_price_id()

    params = %{
      customer: user.stripe_customer_id,
      mode: "subscription",
      line_items: [%{price: price_id, quantity: 1}],
      success_url: success_url,
      cancel_url: cancel_url,
      metadata: %{user_id: user.id}
    }

    case Stripe.Checkout.Session.create(params) do
      {:ok, session} ->
        {:ok, %{url: session.url, session_id: session.id}}

      {:error, %Stripe.Error{} = error} ->
        {:error, error.message}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  @doc """
  Creates a Stripe Customer Portal session for managing subscriptions.
  """
  def create_portal_session(%User{} = user, return_url) do
    case user.stripe_customer_id do
      nil ->
        {:error, "No Stripe customer found. Subscribe first."}

      customer_id ->
        params = %{
          customer: customer_id,
          return_url: return_url
        }

        case Stripe.BillingPortal.Session.create(params) do
          {:ok, session} ->
            {:ok, %{url: session.url}}

          {:error, %Stripe.Error{} = error} ->
            {:error, error.message}

          {:error, reason} ->
            {:error, inspect(reason)}
        end
    end
  end

  # ============================================================================
  # Webhook Processing
  # ============================================================================

  @doc """
  Processes a Stripe webhook event.
  """
  def process_webhook_event(%{"type" => type, "data" => %{"object" => object}}) do
    case type do
      "checkout.session.completed" ->
        handle_checkout_completed(object)

      "customer.subscription.created" ->
        handle_subscription_updated(object)

      "customer.subscription.updated" ->
        handle_subscription_updated(object)

      "customer.subscription.deleted" ->
        handle_subscription_deleted(object)

      "invoice.payment_failed" ->
        handle_payment_failed(object)

      _ ->
        :ok
    end
  end

  defp handle_checkout_completed(%{"customer" => customer_id, "subscription" => subscription_id})
       when is_binary(subscription_id) do
    case get_user_by_stripe_customer(customer_id) do
      nil -> {:error, :user_not_found}
      user -> update_subscription_from_stripe(user, subscription_id)
    end
  end

  defp handle_checkout_completed(_), do: :ok

  defp handle_subscription_updated(%{
         "customer" => customer_id,
         "id" => subscription_id,
         "status" => status,
         "current_period_end" => period_end
       }) do
    case get_user_by_stripe_customer(customer_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        period_end_dt = DateTime.from_unix!(period_end)

        user
        |> Ecto.Changeset.change(%{
          subscription_status: status,
          subscription_stripe_id: subscription_id,
          subscription_current_period_end: DateTime.truncate(period_end_dt, :second)
        })
        |> Repo.update()
    end
  end

  defp handle_subscription_deleted(%{"customer" => customer_id}) do
    case get_user_by_stripe_customer(customer_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        user
        |> Ecto.Changeset.change(%{
          subscription_status: "canceled",
          subscription_stripe_id: nil,
          subscription_current_period_end: nil
        })
        |> Repo.update()
    end
  end

  defp handle_payment_failed(%{"customer" => customer_id}) do
    case get_user_by_stripe_customer(customer_id) do
      nil ->
        {:error, :user_not_found}

      user ->
        user
        |> Ecto.Changeset.change(%{subscription_status: "past_due"})
        |> Repo.update()
    end
  end

  # ============================================================================
  # Stripe Customer Management
  # ============================================================================

  defp ensure_stripe_customer(%User{stripe_customer_id: id} = user) when is_binary(id) and id != "" do
    {:ok, user}
  end

  defp ensure_stripe_customer(%User{} = user) do
    params = %{
      email: user.email,
      name: user.display_name,
      metadata: %{user_id: user.id, username: user.username}
    }

    case Stripe.Customer.create(params) do
      {:ok, customer} ->
        user
        |> Ecto.Changeset.change(%{stripe_customer_id: customer.id})
        |> Repo.update()

      {:error, %Stripe.Error{} = error} ->
        {:error, error.message}

      {:error, reason} ->
        {:error, inspect(reason)}
    end
  end

  defp update_subscription_from_stripe(user, subscription_id) do
    case Stripe.Subscription.retrieve(subscription_id) do
      {:ok, subscription} ->
        period_end = DateTime.from_unix!(subscription.current_period_end)

        user
        |> Ecto.Changeset.change(%{
          subscription_status: subscription.status,
          subscription_stripe_id: subscription.id,
          subscription_current_period_end: DateTime.truncate(period_end, :second)
        })
        |> Repo.update()

      {:error, _} ->
        {:error, :stripe_error}
    end
  end

  defp get_user_by_stripe_customer(customer_id) do
    Repo.get_by(User, stripe_customer_id: customer_id)
  end

  defp get_premium_price_id do
    Application.get_env(:backend, :stripe_premium_price_id) || @premium_price_id
  end
end
