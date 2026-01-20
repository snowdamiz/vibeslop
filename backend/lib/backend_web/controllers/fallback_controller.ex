defmodule BackendWeb.FallbackController do
  use BackendWeb, :controller

  require Logger

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> put_view(json: BackendWeb.ErrorJSON)
    |> render(:"404")
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> put_view(json: BackendWeb.ErrorJSON)
    |> render(:"401")
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> put_view(json: BackendWeb.ChangesetJSON)
    |> render(:error, changeset: changeset)
  end

  # Catch-all for any other errors
  def call(conn, {:error, reason}) do
    Logger.error("Unhandled error in fallback controller: #{inspect(reason)}")

    conn
    |> put_status(:bad_request)
    |> put_view(json: BackendWeb.ErrorJSON)
    |> render(:"400")
  end
end
