import 'server-only';
import { webEnv } from '@repo/env/web';
import { Logger } from '@repo/utils';
import { WaylClient } from '@repo/wayl';
import { v4 as uuidv4 } from 'uuid';

export const waylClient = new WaylClient({
  apiKey: webEnv.WAYL_SECRET_KEY,
  webhookSecret: webEnv.WAYL_WEBHOOK_SECRET,
});

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
      const response = await waylClient.links.create({
        referenceId: refId,
        total: amount,
        currency,
        customParameter: description,
        // In a real app, these should be dynamic
        redirectionUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/plus?success=true`,
        webhookUrl: `${webEnv.NEXT_PUBLIC_SITE_URL}/api/webhooks/wayl`,
        webhookSecret: webEnv.WAYL_WEBHOOK_SECRET,
      });

      return response.data.url;
    } catch (error) {
      Logger.error('Wayl Create Payment Failed:', error);
      throw error;
    }
  },
};
