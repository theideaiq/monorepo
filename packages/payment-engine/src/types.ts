export type Currency = 'IQD';

export interface OrderData {
  referenceId: string;
  amount: number;
  currency: Currency;
  description?: string;
  webhookUrl?: string;
  webhookSecret?: string;
  redirectionUrl?: string;
  customer?: {
    name?: string;
    phone?: string;
    email?: string;
  };
}

export interface PaymentSession {
  sessionId: string;
  url: string;
  provider: string;
  metadata?: Record<string, unknown>;
}

export type WebhookEvent = {
  id: string;
  provider: string;
  type: 'payment.success' | 'payment.failed';
  referenceId: string;
  payload: unknown;
};

export interface PaymentProvider {
  name: string;
  createCheckoutSession(order: OrderData): Promise<PaymentSession>;
  verifyWebhook(rawBody: string, signature?: string): Promise<WebhookEvent>;
}
