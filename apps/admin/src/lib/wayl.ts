import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylAdapter } from '@repo/payment-engine';

const adapter = new WaylAdapter({
  apiKey: adminEnv.WAYL_SECRET_KEY,
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET,
});

import type { WaylClient } from '@repo/wayl';

export const waylClient: WaylClient = adapter.client;
