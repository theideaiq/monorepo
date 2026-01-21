import 'server-only';
import { adminEnv } from '@repo/env/admin';
import { WaylClient } from '@repo/wayl';

export const waylClient = new WaylClient({
  apiKey: adminEnv.WAYL_SECRET_KEY,
  webhookSecret: adminEnv.WAYL_WEBHOOK_SECRET,
});
