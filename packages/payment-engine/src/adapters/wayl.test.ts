import { describe, it, expect } from 'vitest';
import { WaylAdapter } from './wayl';
import { createHmac } from 'node:crypto';

describe('WaylAdapter Webhook Verification', () => {
  const secret = 'test-secret';
  const adapter = new WaylAdapter({ apiKey: 'test-key', webhookSecret: secret });

  it('verifies valid signature', async () => {
    const payloadObj = { id: '123', status: 'Complete', referenceId: 'ref_123' };
    const payload = JSON.stringify(payloadObj);
    const signature = createHmac('sha256', secret).update(payload).digest('hex');

    // Currently accepts unknown, but we will pass string
    const event = await adapter.verifyWebhook(payload as any, signature);
    expect(event).toBeDefined();
    expect(event.id).toBe('123');
  });

  it('rejects invalid signature', async () => {
    const payload = JSON.stringify({ id: '123', status: 'Complete' });
    const signature = 'invalid-signature';

    await expect(adapter.verifyWebhook(payload as any, signature)).rejects.toThrow();
  });

  it('rejects missing signature', async () => {
    const payload = JSON.stringify({ id: '123', status: 'Complete' });
    await expect(adapter.verifyWebhook(payload as any)).rejects.toThrow();
  });
});
