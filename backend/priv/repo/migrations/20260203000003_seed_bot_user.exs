defmodule Backend.Repo.Migrations.SeedBotUser do
  use Ecto.Migration

  def up do
    # Insert the bot user with a fixed UUID
    # This ensures the bot user exists in all environments
    execute """
    INSERT INTO users (
      id,
      email,
      username,
      display_name,
      bio,
      avatar_url,
      is_verified,
      is_system_bot,
      has_onboarded,
      inserted_at,
      updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000001',
      'bot@onvibe.app',
      'onvibe',
      'Onvibe',
      'Official Onvibe bot. Sharing trending projects and platform updates.',
      '/logo.svg',
      true,
      true,
      true,
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING
    """
  end

  def down do
    execute """
    DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001'
    """
  end
end
