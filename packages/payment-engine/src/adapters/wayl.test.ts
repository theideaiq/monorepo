import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WaylAdapter } from './wayl';

describe('WaylAdapter', () => {
  const secret = 'test-secret';
  const adapter = new WaylAdapter({
    apiKey: 'test-key',
    webhookSecret: secret,
  });

  const payload = JSON.stringify({
    id: 'link_123',
    status: 'Complete',
    referenceId: 'ref_123',
    url: 'https://example.com',
    amount: 1000,
    currency: 'IQD',
  });

  it('should verify valid signature', async () => {
    const signature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const event = await adapter.verifyWebhook(payload, signature);
    expect(event.type).toBe('payment.success');
    expect(event.id).toBe('link_123');
  });

  it('should throw on invalid signature', async () => {
    const signature = 'invalid-signature';
    await expect(adapter.verifyWebhook(payload, signature)).rejects.toThrow(
      'Webhook Error: Invalid signature',
    );
  });

  it('should throw on missing signature when secret is configured', async () => {
    await expect(adapter.verifyWebhook(payload)).rejects.toThrow(
      'Webhook Error: Missing signature',
    );
  });

  it('should skip verification if secret is not configured', async () => {
    const noSecretAdapter = new WaylAdapter({ apiKey: 'test-key' });
    // Should not throw even without signature
    const event = await noSecretAdapter.verifyWebhook(payload);
    expect(event.type).toBe('payment.success');
  });

  it('should parse failed payment correctly', async () => {
    const failedPayload = JSON.stringify({
      id: 'link_123',
      status: 'Failed',
      referenceId: 'ref_123',
    });

    // We can use noSecretAdapter for simplicity or valid signature
    const noSecretAdapter = new WaylAdapter({ apiKey: 'test-key' });
    const event = await noSecretAdapter.verifyWebhook(failedPayload);
    expect(event.type).toBe('payment.failed');
  });
});
