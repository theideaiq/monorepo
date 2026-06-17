import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY || 'placeholder-key',
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET || 'placeholder-secret',
});

export const waylClient = adapter.client;
