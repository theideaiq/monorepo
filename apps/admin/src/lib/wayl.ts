import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY,
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET,
});

// biome-ignore lint/suspicious/noExplicitAny: explicit any to avoid direct dependency on @repo/wayl in admin
// @ts-expect-error - Explicitly any to avoid direct dependency on @repo/wayl in admin
export const waylClient: any = adapter.client;
