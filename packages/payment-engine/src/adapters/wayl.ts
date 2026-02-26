import { type Link, WaylClient } from '@repo/wayl';
import type {
  OrderData,
  PaymentProvider,
  PaymentSession,
  WebhookEvent,
} from '../types';

export class WaylAdapter implements PaymentProvider {
  public readonly name = 'wayl';
  public readonly client: WaylClient;
  private webhookSecret?: string;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    webhookSecret?: string;
  }) {
    this.client = new WaylClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
    });
    this.webhookSecret = config.webhookSecret;
  }

  async createCheckoutSession(order: OrderData): Promise<PaymentSession> {
    const response = await this.client.links.create({
      referenceId: order.referenceId,
      total: order.amount,
      currency: order.currency,
      webhookUrl: order.webhookUrl,
      webhookSecret: order.webhookSecret || this.webhookSecret,
      redirectionUrl: order.redirectionUrl,
      // Mapping 'description' to 'customParameter' as an example, or could leave it out
      customParameter: order.description,
    });

    return {
      sessionId: response.data.id,
      url: response.data.url,
      provider: this.name,
      metadata: {
        referenceId: response.data.referenceId,
      },
    };
  }

  async verifyWebhook(
    payload: unknown,
    _signature?: string,
  ): Promise<WebhookEvent> {
    const data = payload as Link;

    // Verify the payment status by fetching it directly from Wayl API.
    // This prevents attackers from spoofing webhooks with fake success statuses.
    const { data: verifiedLink } = await this.client.links.get(data.id);

    let type: WebhookEvent['type'] = 'payment.failed';
    if (
      verifiedLink.status === 'Complete' ||
      verifiedLink.status === 'Delivered'
    ) {
      type = 'payment.success';
    }

    return {
      id: verifiedLink.id,
      provider: this.name,
      type,
      referenceId: verifiedLink.referenceId,
      payload: verifiedLink,
    };
  }
}
