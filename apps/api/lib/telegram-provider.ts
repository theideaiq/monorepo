import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Telegram sign-in is a custom OIDC provider of Supabase Auth
 * (`custom:telegram`, core.telegram.org/bots/telegram-login): Supabase runs
 * the flow with the bot's Client ID and Secret and checks Telegram's ID
 * token. Telegram gives no email (a Pass starts with one; the database
 * refuses a Telegram-only Pass) and puts the Telegram user id in the `id`
 * claim, which the allowlist keeps so the database can link the bot
 * account. Staff → Telegram → Bot creates or updates it.
 */

export const TELEGRAM_PROVIDER = "custom:telegram";

export const telegramProviderSettings = (client: {
  clientId: string;
  clientSecret: string;
}) => ({
  client_id: client.clientId,
  client_secret: client.clientSecret,
  custom_claims_allowlist: ["id"],
  email_optional: true,
  enabled: true,
  issuer: "https://oauth.telegram.org",
  name: "Telegram",
  pkce_enabled: true,
  scopes: ["openid", "profile", "telegram:bot_access"],
});

/** Creates the provider, or brings its settings up to date. */
export const syncTelegramProvider = async (
  admin: SupabaseClient,
  client: { clientId: string; clientSecret: string }
) => {
  const api = admin.auth.admin.customProviders;
  const settings = telegramProviderSettings(client);
  const existing = await api.getProvider(TELEGRAM_PROVIDER);
  const { error } = existing.data
    ? await api.updateProvider(TELEGRAM_PROVIDER, settings)
    : await api.createProvider({
        ...settings,
        identifier: TELEGRAM_PROVIDER,
        provider_type: "oidc",
      });
  if (error) {
    throw new Error(`Supabase refused the Telegram provider: ${error.message}`);
  }
};

/** Whether the provider is there and turned on. */
export const telegramProviderEnabled = async (admin: SupabaseClient) => {
  const { data } =
    await admin.auth.admin.customProviders.getProvider(TELEGRAM_PROVIDER);
  return Boolean(data?.enabled);
};
