import { describe, it, expect, vi } from 'vitest';
import { paymentFactory } from './config';

// Mock the environment variables
vi.mock('@repo/env/web', () => ({
  webEnv: {
    WAYL_SECRET_KEY: 'mock-wayl-key',
    WAYL_WEBHOOK_SECRET: 'mock-webhook-secret',
    ZAIN_SECRET_KEY: 'mock-zain-key',
  },
}));

describe('PaymentFactory Routing Logic', () => {
  describe('getProvider', () => {
    it('should return Wayl adapter for amounts <= 500,000 IQD', () => {
      const provider = paymentFactory.getProvider(500000);
      expect(provider.name).toBe('wayl');
    });

    it('should return ZainDirect adapter for amounts > 500,000 IQD', () => {
      const provider = paymentFactory.getProvider(500001);
      expect(provider.name).toBe('zain-direct');
    });
  });

  describe('getProviderByName', () => {
    it('should return Wayl adapter when requested explicitly', () => {
      const provider = paymentFactory.getProviderByName('wayl');
      expect(provider.name).toBe('wayl');
    });

    it('should return ZainDirect adapter when requested explicitly', () => {
      const provider = paymentFactory.getProviderByName('zain-direct');
      expect(provider.name).toBe('zain-direct');
    });
  });
});
