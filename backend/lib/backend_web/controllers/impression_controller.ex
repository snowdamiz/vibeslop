defmodule BackendWeb.ImpressionController do
  use BackendWeb, :controller

  alias Backend.Content

  @doc """
  Records impressions for multiple posts/projects in a batch.
  POST /api/impressions
  Body: %{impressions: [%{type: "post" | "project", id: uuid}, ...], fingerprint: "optional-client-fingerprint"}

  For authenticated users: uses user_id
  For anonymous users: requires fingerprint from client
  """
  def create(conn, %{"impressions" => impressions} = params) when is_list(impressions) do
    # Get user_id from conn if authenticated (set by OptionalAuth plug)
    current_user = conn.assigns[:current_user]
    user_id = if current_user, do: current_user.id, else: nil

    # Get client fingerprint (for anonymous users)
    fingerprint = params["fingerprint"]

    # Get IP address from connection
    ip_address = get_ip_address(conn)

    # Validate that we have either user_id or fingerprint
    if is_nil(user_id) and (is_nil(fingerprint) or fingerprint == "") do
      conn
      |> put_status(:bad_request)
      |> json(%{success: false, error: "Either authentication or fingerprint is required"})
    else
      case Content.record_impressions(impressions,
        user_id: user_id,
        fingerprint: fingerprint,
        ip_address: ip_address
      ) do
        {:ok, count} ->
          json(conn, %{success: true, count: count})

        {:error, _reason} ->
          conn
          |> put_status(:unprocessable_entity)
          |> json(%{success: false, error: "Failed to record impressions"})
      end
    end
  end

  def create(conn, _params) do
    conn
    |> put_status(:bad_request)
    |> json(%{success: false, error: "Invalid request format"})
  end

  defp get_ip_address(conn) do
    # Check for forwarded IP first (if behind proxy)
    case Plug.Conn.get_req_header(conn, "x-forwarded-for") do
      [ip | _] -> String.split(ip, ",") |> List.first() |> String.trim()
      [] ->
        # Fall back to remote_ip
        case conn.remote_ip do
          {a, b, c, d} -> "#{a}.#{b}.#{c}.#{d}"
          _ -> nil
        end
    end
  end
end
