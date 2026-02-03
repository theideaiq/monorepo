import crypto from 'node:crypto';
import { WaylAdapter } from '@repo/payment-engine';
import { describe, expect, it } from 'vitest';

describe('WaylAdapter Webhook Verification', () => {
  const secret = 'test-secret';
  const adapter = new WaylAdapter({ apiKey: 'key', webhookSecret: secret });

  it('verifies valid signature', async () => {
    const payload = JSON.stringify({
      id: '1',
      status: 'Complete',
      referenceId: 'ref1',
    });
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    const event = await adapter.verifyWebhook(payload, signature);
    expect(event.type).toBe('payment.success');
    expect(event.id).toBe('1');
  });

  it('rejects invalid signature', async () => {
    const payload = JSON.stringify({ id: '1', status: 'Complete' });
    const signature = 'invalid-signature';

    await expect(adapter.verifyWebhook(payload, signature)).rejects.toThrow(
      'Invalid signature',
    );
  });

  it('rejects tampered payload', async () => {
    const payload = JSON.stringify({ id: '1', status: 'Complete' });
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    const tamperedPayload = payload.replace('Complete', 'Failed');

    await expect(
      adapter.verifyWebhook(tamperedPayload, signature),
    ).rejects.toThrow('Invalid signature');
  });
});
