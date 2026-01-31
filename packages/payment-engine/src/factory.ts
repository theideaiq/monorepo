import { WaylAdapter } from './adapters/wayl';
import { ZainDirectAdapter } from './adapters/zain';
import type { PaymentProvider } from './types';

export interface FactoryConfig {
  waylKey: string;
  zainKey: string;
  waylBaseUrl?: string;
  waylWebhookSecret?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class PaymentFactory {
  /**
   * Returns a payment provider instance based on the transaction amount.
   *
   * Logic:
   * - <= 500,000 IQD: Returns `WaylAdapter` (Active)
   * - > 500,000 IQD: Returns `ZainDirectAdapter` (⚠️ Not Implemented - will throw error)
   *
   * @param amount - Transaction amount in IQD
   * @param config - Factory configuration containing API keys
   */
  static getProvider(amount: number, config: FactoryConfig): PaymentProvider {
    // Hybrid logic: Use Zain for large amounts (> 500,000 IQD)
    if (amount > 500000) {
      return new ZainDirectAdapter({ apiKey: config.zainKey });
    }

    // Default to Wayl
    return new WaylAdapter({
      apiKey: config.waylKey,
      baseUrl: config.waylBaseUrl,
      webhookSecret: config.waylWebhookSecret,
    });
  }

  static getProviderByName(
    name: string,
    config: FactoryConfig,
  ): PaymentProvider {
    if (name === 'zain-direct') {
      return new ZainDirectAdapter({ apiKey: config.zainKey });
    }
    return new WaylAdapter({
      apiKey: config.waylKey,
      baseUrl: config.waylBaseUrl,
      webhookSecret: config.waylWebhookSecret,
    });
  }
}
