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
   * Selects a payment provider based on the transaction amount.
   *
   * @param amount - The transaction amount in IQD.
   * @param config - Configuration keys for the providers.
   * @returns A PaymentProvider instance.
   *
   * @remarks
   * - Amounts > 500,000 IQD are routed to `ZainDirectAdapter` (currently NOT IMPLEMENTED).
   * - Amounts <= 500,000 IQD are routed to `WaylAdapter`.
   *
   * @throws {Error} If the amount triggers the Zain adapter (Not Implemented).
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

  /**
   * Selects a payment provider by its explicit name.
   *
   * @param name - The name of the provider (e.g., 'zain-direct', 'wayl').
   * @param config - Configuration keys for the providers.
   * @returns A PaymentProvider instance.
   */
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
