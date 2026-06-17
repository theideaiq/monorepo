import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY,
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET,
});

// Since WaylClient is an internal class of @repo/payment-engine's wayl adapter (or @repo/wayl), we can export it via type inference or cast it.
// We avoid importing directly from @repo/wayl to avoid dependency issues if it's not in package.json.
export const waylClient = adapter.client as any;
