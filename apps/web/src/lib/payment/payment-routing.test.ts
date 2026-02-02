import { PaymentFactory } from '@repo/payment-engine';
import { describe, expect, it } from 'vitest';

describe('PaymentFactory (@repo/payment-engine)', () => {
  const dummyConfig = {
    waylKey: 'test_wayl_key',
    zainKey: 'test_zain_key',
    waylWebhookSecret: 'test_secret',
  };

  describe('getProvider', () => {
    it('should return ZainDirectAdapter for amounts > 500,000 IQD', () => {
      const provider = PaymentFactory.getProvider(500001, dummyConfig);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter for amounts <= 500,000 IQD', () => {
      // Boundary check
      const providerBoundary = PaymentFactory.getProvider(500000, dummyConfig);
      expect(providerBoundary.name).toBe('wayl');

      // Low amount check
      const providerLow = PaymentFactory.getProvider(100, dummyConfig);
      expect(providerLow.name).toBe('wayl');
    });
  });

  describe('getProviderByName', () => {
    it('should return ZainDirectAdapter when requested explicitly', () => {
      const provider = PaymentFactory.getProviderByName('zain-direct', dummyConfig);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter when requested explicitly', () => {
      // The implementation defaults to Wayl if not zain-direct, but let's test with 'wayl'
      const provider = PaymentFactory.getProviderByName('wayl', dummyConfig);
      expect(provider.name).toBe('wayl');
    });

    it('should return WaylAdapter for unknown names (default behavior)', () => {
      const provider = PaymentFactory.getProviderByName('unknown-provider', dummyConfig);
      expect(provider.name).toBe('wayl');
    });
  });
});
