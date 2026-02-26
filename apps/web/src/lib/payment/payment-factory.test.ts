import { PaymentFactory } from '@repo/payment-engine';
import { describe, expect, it } from 'vitest';

describe('PaymentFactory (@repo/payment-engine)', () => {
  const mockConfig = {
    waylKey: 'mock-wayl-key',
    zainKey: 'mock-zain-key',
    waylWebhookSecret: 'mock-secret',
  };

  describe('getProvider', () => {
    it('should return Wayl adapter for amounts below threshold (< 500,000 IQD)', () => {
      const provider = PaymentFactory.getProvider(1000, mockConfig);
      expect(provider.name).toBe('wayl');
    });

    it('should return Wayl adapter for amounts exactly at threshold (500,000 IQD)', () => {
      const provider = PaymentFactory.getProvider(500000, mockConfig);
      expect(provider.name).toBe('wayl');
    });

    it('should return Zain adapter for amounts above threshold (> 500,000 IQD)', () => {
      const provider = PaymentFactory.getProvider(500001, mockConfig);
      expect(provider.name).toBe('zain-direct');
    });
  });

  describe('getProviderByName', () => {
    it('should return Zain adapter when explicitly requested', () => {
      const provider = PaymentFactory.getProviderByName('zain-direct', mockConfig);
      expect(provider.name).toBe('zain-direct');
    });

    it('should default to Wayl adapter for unknown names', () => {
      const provider = PaymentFactory.getProviderByName('unknown-provider', mockConfig);
      expect(provider.name).toBe('wayl');
    });
  });
});
