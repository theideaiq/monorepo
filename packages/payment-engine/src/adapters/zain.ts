import type {
  OrderData,
  PaymentProvider,
  PaymentSession,
  WebhookEvent,
} from '../types';

export class ZainDirectAdapter implements PaymentProvider {
  public readonly name = 'zain-direct';

  // biome-ignore lint/complexity/noUselessConstructor: Stub implementation
  constructor(_config: { apiKey: string }) {
    // Config unused for stub
  }

  async createCheckoutSession(_order: OrderData): Promise<PaymentSession> {
    throw new Error('ZainDirectAdapter: Not Implemented');
  }

  async verifyWebhook(
    _rawBody: string,
    _signature?: string,
  ): Promise<WebhookEvent> {
    throw new Error('ZainDirectAdapter: Not Implemented');
  }
}
