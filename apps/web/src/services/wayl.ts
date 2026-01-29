import 'server-only';
import { webEnv } from '@repo/env/web';
import { PaymentFactory } from '@repo/payment-engine';
import { Logger } from '@repo/utils';
import { v4 as uuidv4 } from 'uuid';

export const wayl = {
  /**
   * Creates a payment session with the Wayl payment gateway.
   *
   * @param amount - The amount to charge.
   * @param currency - The currency code (e.g., 'IQD').
   * @param description - Description of the transaction.
   * @param referenceId - Unique order ID. If not provided, one will be generated.
   * @returns A promise resolving to the payment checkout URL.
   */
  createPayment: async (
    amount: number,
    currency: 'IQD',
    description: string,
    referenceId?: string,
  ) => {
    const refId = referenceId || uuidv4();
    Logger.log('Creating payment session:', {
      amount,
      currency,
      description,
      refId,
    });

    try {
      // Use explicit 'wayl' provider as this service is named 'wayl'
      const provider = PaymentFactory.getProviderByName('wayl', {
        waylKey: webEnv.WAYL_SECRET_KEY,
        waylWebhookSecret: webEnv.WAYL_WEBHOOK_SECRET,
        zainKey: webEnv.ZAIN_SECRET_KEY,
      });

      const session = await provider.createCheckoutSession({
        referenceId: refId,
        amount,
        currency,
        description,
        webhookUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/api/webhooks/wayl`,
        webhookSecret: webEnv.WAYL_WEBHOOK_SECRET,
        redirectionUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/plus?success=true`,
      });

      return session.url;
    } catch (error) {
      Logger.error('Wayl Create Payment Failed:', error);
      throw error;
    }
  },
};
