defmodule Backend.Auth.Token do
  use Joken.Config

  @impl true
  def token_config do
    # 7 days
    default_claims(default_exp: 60 * 60 * 24 * 7, iss: "vibeslop")
  end

  @doc """
  Generates a JWT token for a user.
  """
  def generate_token(user_id) do
    extra_claims = %{
      "user_id" => user_id,
      "iss" => "vibeslop"
    }

    generate_and_sign(extra_claims, get_signer())
  end

  @doc """
  Verifies a JWT token and returns the claims.
  """
  def verify_token(token) do
    verify_and_validate(token, get_signer())
  end

  @doc """
  Extracts the user_id from a verified token.
  """
  def get_user_id(claims) when is_map(claims) do
    Map.get(claims, "user_id")
  end

  defp get_signer do
    secret = get_secret_key()
    Joken.Signer.create("HS256", secret)
  end

  defp get_secret_key do
    Application.get_env(:backend, :jwt_secret) ||
      System.get_env("JWT_SECRET") ||
      raise "JWT_SECRET not configured!"
  end
end
