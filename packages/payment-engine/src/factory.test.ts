import { describe, expect, it } from 'vitest';
import { WaylAdapter } from './adapters/wayl';
import { ZainDirectAdapter } from './adapters/zain';
import { PaymentFactory, type FactoryConfig } from './factory';

describe('PaymentFactory', () => {
  const mockConfig: FactoryConfig = {
    waylKey: 'test_wayl_key',
    zainKey: 'test_zain_key',
    waylBaseUrl: 'https://test.wayl.com',
    waylWebhookSecret: 'test_wayl_webhook_secret',
  };

  describe('getProvider', () => {
    it('should return ZainDirectAdapter for amounts greater than 500,000', () => {
      // Arrange
      const amount = 500001;

      // Act
      const provider = PaymentFactory.getProvider(amount, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(ZainDirectAdapter);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter for amounts equal to 500,000', () => {
      // Arrange
      const amount = 500000;

      // Act
      const provider = PaymentFactory.getProvider(amount, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
      expect(provider.name).toBe('wayl');
    });

    it('should return WaylAdapter for amounts less than 500,000', () => {
      // Arrange
      const amount = 499999;

      // Act
      const provider = PaymentFactory.getProvider(amount, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
      expect(provider.name).toBe('wayl');
    });
  });

  describe('getProviderByName', () => {
    it('should return ZainDirectAdapter when name is "zain-direct"', () => {
      // Arrange
      const name = 'zain-direct';

      // Act
      const provider = PaymentFactory.getProviderByName(name, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(ZainDirectAdapter);
      expect(provider.name).toBe('zain-direct');
    });

    it('should return WaylAdapter when name is "wayl"', () => {
      // Arrange
      const name = 'wayl';

      // Act
      const provider = PaymentFactory.getProviderByName(name, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
      expect(provider.name).toBe('wayl');
    });

    it('should return WaylAdapter as fallback for unknown names', () => {
      // Arrange
      const name = 'unknown-provider';

      // Act
      const provider = PaymentFactory.getProviderByName(name, mockConfig);

      // Assert
      expect(provider).toBeInstanceOf(WaylAdapter);
      expect(provider.name).toBe('wayl');
    });
  });
});
