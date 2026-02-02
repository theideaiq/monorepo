import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY,
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET,
});

// biome-ignore lint/suspicious/noExplicitAny: Client type is complex and inferred
export const waylClient: any = adapter.client;
