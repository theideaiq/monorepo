import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY || 'dummy_key',
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET || 'dummy_secret',
});

export const waylClient: any = adapter.client;
