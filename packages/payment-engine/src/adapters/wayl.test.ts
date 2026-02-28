import { describe, expect, it } from 'vitest';
import { WaylAdapter } from './wayl';

describe('WaylAdapter', () => {
  describe('verifyWebhook', () => {
    const adapter = new WaylAdapter({ apiKey: 'test-api-key' });

    it('should map Complete status to payment.success event', async () => {
      const payload = {
        id: 'link_123',
        status: 'Complete',
        referenceId: 'order_456',
      };

      const result = await adapter.verifyWebhook(payload);

      expect(result).toEqual({
        id: 'link_123',
        provider: 'wayl',
        type: 'payment.success',
        referenceId: 'order_456',
        payload: payload,
      });
    });

    it('should map Delivered status to payment.success event', async () => {
      const payload = {
        id: 'link_123',
        status: 'Delivered',
        referenceId: 'order_456',
      };

      const result = await adapter.verifyWebhook(payload);

      expect(result).toEqual({
        id: 'link_123',
        provider: 'wayl',
        type: 'payment.success',
        referenceId: 'order_456',
        payload: payload,
      });
    });

    it('should map other statuses (e.g. Failed) to payment.failed event', async () => {
      const payload = {
        id: 'link_123',
        status: 'Failed',
        referenceId: 'order_456',
      };

      const result = await adapter.verifyWebhook(payload);

      expect(result).toEqual({
        id: 'link_123',
        provider: 'wayl',
        type: 'payment.failed',
        referenceId: 'order_456',
        payload: payload,
      });
    });
  });
});
