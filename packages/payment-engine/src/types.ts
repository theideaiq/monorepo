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

/**
 * Interface that all payment gateway adapters must implement.
 * Ensures consistent handling of checkout creation and webhook verification
 * across different providers (e.g., Wayl, Zain).
 *
 * @example
 * class StripeAdapter implements PaymentProvider {
 *   name = 'stripe';
 *   async createCheckoutSession(order: OrderData) { ... }
 *   async verifyWebhook(payload: unknown, signature?: string) { ... }
 * }
 */
export interface PaymentProvider {
  /** The unique identifier for the provider (e.g., 'wayl', 'zain') */
  name: string;

  /**
   * Generates a checkout session URL for the user to complete payment.
   * @param order - The order details including amount, reference, and webhooks.
   * @returns A session object containing the redirect URL.
   */
  createCheckoutSession(order: OrderData): Promise<PaymentSession>;

  /**
   * Verifies the authenticity of an incoming webhook and standardizes the event.
   * @param payload - The raw or parsed payload from the provider.
   * @param signature - The cryptographic signature from the request headers.
   * @returns A standardized event indicating success or failure.
   */
  verifyWebhook(payload: unknown, signature?: string): Promise<WebhookEvent>;
}
