import { WaylAdapter } from './adapters/wayl';
import { ZainDirectAdapter } from './adapters/zain';
import { PAYMENT_PROVIDERS, ZAIN_DIRECT_THRESHOLD } from './constants';
import type { PaymentProvider } from './types';

export interface FactoryConfig {
  waylKey: string;
  zainKey: string;
  waylBaseUrl?: string;
  waylWebhookSecret?: string;
}

// biome-ignore lint/complexity/noStaticOnlyClass: Factory pattern preference
export class PaymentFactory {
  static getProvider(amount: number, config: FactoryConfig): PaymentProvider {
    // Hybrid logic: Use Zain for large amounts (> 500,000 IQD)
    if (amount > ZAIN_DIRECT_THRESHOLD) {
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
    if (name === PAYMENT_PROVIDERS.ZAIN_DIRECT) {
      return new ZainDirectAdapter({ apiKey: config.zainKey });
    }
    return new WaylAdapter({
      apiKey: config.waylKey,
      baseUrl: config.waylBaseUrl,
      webhookSecret: config.waylWebhookSecret,
    });
  }
}
