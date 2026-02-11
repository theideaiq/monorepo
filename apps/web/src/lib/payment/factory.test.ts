import { describe, it, expect } from 'vitest';
import { PaymentFactory, WaylAdapter, ZainDirectAdapter } from '@repo/payment-engine';

describe('PaymentFactory', () => {
  const config = {
    waylKey: 'test-wayl-key',
    zainKey: 'test-zain-key',
    waylWebhookSecret: 'test-webhook-secret',
    waylBaseUrl: 'https://test.wayl.com',
  };

  describe('getProvider', () => {
    it('should return ZainDirectAdapter for amounts > 500,000 IQD', () => {
      // Arrange
      const largeAmount = 500001;

      // Act
      const provider = PaymentFactory.getProvider(largeAmount, config);

      // Assert
      expect(provider).toBeInstanceOf(ZainDirectAdapter);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter for amounts <= 500,000 IQD', () => {
      // Arrange
      const smallAmount = 500000;
      const verySmallAmount = 1;

      // Act
      const provider1 = PaymentFactory.getProvider(smallAmount, config);
      const provider2 = PaymentFactory.getProvider(verySmallAmount, config);

      // Assert
      expect(provider1).toBeInstanceOf(WaylAdapter);
      expect(provider1.name).toBe('wayl');
      expect(provider2).toBeInstanceOf(WaylAdapter);
      expect(provider2.name).toBe('wayl');
    });
  });

  describe('getProviderByName', () => {
    it('should return ZainDirectAdapter when requested by name', () => {
      // Act
      const provider = PaymentFactory.getProviderByName('zain-direct', config);

      // Assert
      expect(provider).toBeInstanceOf(ZainDirectAdapter);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter when requested by name', () => {
      // Act
      const provider = PaymentFactory.getProviderByName('wayl', config);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
      expect(provider.name).toBe('wayl');
    });

    it('should default to WaylAdapter for unknown names', () => {
      // Act
      const provider = PaymentFactory.getProviderByName('unknown-provider', config);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
    });
  });
});
