import { describe, expect, it } from 'vitest';
import { PaymentFactory } from './factory';
import { WaylAdapter } from './adapters/wayl';
import { ZainDirectAdapter } from './adapters/zain';

describe('PaymentFactory', () => {
  const mockConfig = {
    waylKey: 'wayl-secret-key',
    zainKey: 'zain-secret-key',
    waylBaseUrl: 'https://api.wayl.com',
    waylWebhookSecret: 'wayl-webhook-secret',
  };

  describe('getProvider', () => {
    it('should return WaylAdapter for amount <= 500000', () => {
      // Act
      const provider1 = PaymentFactory.getProvider(500000, mockConfig);
      const provider2 = PaymentFactory.getProvider(1000, mockConfig);
      const provider3 = PaymentFactory.getProvider(0, mockConfig);

      // Assert
      expect(provider1).toBeInstanceOf(WaylAdapter);
      expect(provider2).toBeInstanceOf(WaylAdapter);
      expect(provider3).toBeInstanceOf(WaylAdapter);
    });

    it('should return ZainDirectAdapter for amount > 500000', () => {
      // Act
      const provider1 = PaymentFactory.getProvider(500001, mockConfig);
      const provider2 = PaymentFactory.getProvider(1000000, mockConfig);

      // Assert
      expect(provider1).toBeInstanceOf(ZainDirectAdapter);
      expect(provider2).toBeInstanceOf(ZainDirectAdapter);
    });
  });

  describe('getProviderByName', () => {
    it('should return ZainDirectAdapter when name is zain-direct', () => {
      // Act
      const provider = PaymentFactory.getProviderByName('zain-direct', mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(ZainDirectAdapter);
    });

    it('should return WaylAdapter for any other name', () => {
      // Act
      const provider1 = PaymentFactory.getProviderByName('wayl', mockConfig);
      const provider2 = PaymentFactory.getProviderByName('unknown-provider', mockConfig);

      // Assert
      expect(provider1).toBeInstanceOf(WaylAdapter);
      expect(provider2).toBeInstanceOf(WaylAdapter);
    });
  });
});
