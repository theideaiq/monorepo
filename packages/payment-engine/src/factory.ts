import { WaylAdapter } from './adapters/wayl';
import { ZainDirectAdapter } from './adapters/zain';
import type { PaymentProvider } from './types';

export interface FactoryConfig {
  waylKey: string;
  zainKey: string;
  waylBaseUrl?: string;
  waylWebhookSecret?: string;
}

/**
 * Factory for creating payment provider instances.
 * Handles routing logic between different providers based on transaction criteria.
 */
// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class PaymentFactory {
  /**
   * Determines and returns the appropriate payment provider based on the transaction amount.
   *
   * @param amount - The transaction amount in IQD.
   * @param config - Configuration object containing API keys.
   * @returns An instance of `PaymentProvider`.
   *
   * @remarks
   * **Smart Routing Logic:**
   * - **Amount <= 500,000 IQD**: Returns `WaylAdapter` (Standard provider).
   * - **Amount > 500,000 IQD**: Returns `ZainDirectAdapter` (High-value provider).
   *
   * @warning
   * The `ZainDirectAdapter` (for amounts > 500,000) is currently **NOT IMPLEMENTED**
   * and will throw an error if used. Do not process transactions > 500,000 IQD until this is resolved.
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
   * Returns a specific payment provider by name.
   *
   * @param name - The name of the provider ('wayl' or 'zain-direct').
   * @param config - Configuration object containing API keys.
   * @returns An instance of `PaymentProvider`.
   *
   * @warning
   * Requesting 'zain-direct' will return a stub adapter that throws errors on use.
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
