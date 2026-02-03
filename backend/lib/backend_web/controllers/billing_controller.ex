defmodule BackendWeb.BillingController do
  use BackendWeb, :controller

  alias Backend.Billing

  action_fallback BackendWeb.FallbackController

  @doc """
  Returns the current user's subscription status.
  """
  def status(conn, _params) do
    user = conn.assigns.current_user
    info = Billing.get_subscription_info(user)

    conn
    |> put_status(:ok)
    |> json(%{
      status: info.status,
      is_premium: info.is_premium,
      current_period_end: info.current_period_end && DateTime.to_iso8601(info.current_period_end)
    })
  end

  @doc """
  Creates a Stripe Checkout session and returns the URL.
  """
  def create_checkout(conn, params) do
    user = conn.assigns.current_user
    frontend_url = get_frontend_url()
    success_url = Map.get(params, "success_url", "#{frontend_url}/settings?tab=billing&status=success")
    cancel_url = Map.get(params, "cancel_url", "#{frontend_url}/settings?tab=billing&status=canceled")

    case Billing.create_checkout_session(user, success_url, cancel_url) do
      {:ok, %{url: url}} ->
        conn
        |> put_status(:ok)
        |> json(%{url: url})

      {:error, message} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "checkout_failed", message: message})
    end
  end

  @doc """
  Creates a Stripe Customer Portal session and returns the URL.
  """
  def create_portal(conn, params) do
    user = conn.assigns.current_user
    frontend_url = get_frontend_url()
    return_url = Map.get(params, "return_url", "#{frontend_url}/settings?tab=billing")

    case Billing.create_portal_session(user, return_url) do
      {:ok, %{url: url}} ->
        conn
        |> put_status(:ok)
        |> json(%{url: url})

      {:error, message} ->
        conn
        |> put_status(:unprocessable_entity)
        |> json(%{error: "portal_failed", message: message})
    end
  end

  @doc """
  Handles Stripe webhook events.
  Verifies the webhook signature and processes the event.
  """
  def webhook(conn, _params) do
    with {:ok, raw_body} <- read_raw_body(conn),
         {:ok, event} <- verify_webhook(raw_body, conn) do
      case Billing.process_webhook_event(event) do
        :ok ->
          conn |> put_status(:ok) |> json(%{received: true})

        {:ok, _} ->
          conn |> put_status(:ok) |> json(%{received: true})

        {:error, reason} ->
          require Logger
          Logger.error("Webhook processing error: #{inspect(reason)}")
          conn |> put_status(:ok) |> json(%{received: true})
      end
    else
      {:error, :invalid_signature} ->
        conn
        |> put_status(:bad_request)
        |> json(%{error: "invalid_signature"})

      {:error, reason} ->
        require Logger
        Logger.error("Webhook error: #{inspect(reason)}")

        conn
        |> put_status(:bad_request)
        |> json(%{error: "webhook_error", message: inspect(reason)})
    end
  end

  defp read_raw_body(conn) do
    case conn.assigns[:raw_body] do
      nil -> {:error, :no_raw_body}
      body -> {:ok, body}
    end
  end

  defp verify_webhook(raw_body, conn) do
    signature = get_req_header(conn, "stripe-signature") |> List.first()
    signing_secret = Application.get_env(:stripity_stripe, :signing_secret)

    if signature && signing_secret do
      case Stripe.Webhook.construct_event(raw_body, signature, signing_secret) do
        {:ok, event} -> {:ok, event}
        {:error, _} -> {:error, :invalid_signature}
      end
    else
      # In dev mode without webhook secret, parse the body directly
      case Jason.decode(raw_body) do
        {:ok, event} -> {:ok, event}
        {:error, _} -> {:error, :invalid_json}
      end
    end
  end

  defp get_frontend_url do
    Application.get_env(:backend, :frontend_url) ||
      System.get_env("FRONTEND_URL") ||
      "http://localhost:5173"
  end
end
