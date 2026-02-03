defmodule BackendWeb.Plugs.RawBody do
  @moduledoc """
  Plug that reads and caches the raw request body.
  Required for Stripe webhook signature verification.
  """

  @behaviour Plug

  @impl true
  def init(opts), do: opts

  @impl true
  def call(conn, _opts) do
    case Plug.Conn.read_body(conn) do
      {:ok, body, conn} ->
        Plug.Conn.assign(conn, :raw_body, body)
        |> Plug.Conn.put_private(:raw_body, body)

      {:more, _body, conn} ->
        conn

      {:error, _reason} ->
        conn
    end
  end
end
