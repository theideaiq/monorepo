// The Gateway imports the specific execution engines (The Infrastructure)
import { createPaymentLink as processWayl } from './providers/wayl/links';
// import { createPaymentLink as processZainCash } from './providers/zaincash/links';

// The Gateway imports the Universal Language (The Core Domain)
import type { 
  UniversalCheckoutRequest, 
  UniversalCheckoutResponse, 
  PaymentProvider 
} from './types';
import { env } from '@auibsal/env';

// Establish the primary engine from Vercel environment variables
const PRIMARY_PROVIDER = (env.PRIMARY_PAYMENT_PROVIDER as PaymentProvider) || 'wayl';

/**
 * The Switchboard Operator
 * Receives a universal request, routes it to the correct provider engine, 
 * and returns a universal response.
 */
export async function processCheckout(
  req: UniversalCheckoutRequest,
  requestedProvider?: PaymentProvider
): Promise<UniversalCheckoutResponse> {
  
  const targetProvider = requestedProvider || PRIMARY_PROVIDER;

  switch (targetProvider) {
    case 'wayl': {
      // The Gateway simply hands the Universal request to the Wayl Adapter.
      // The Adapter handles the internal translation to Wayl's specific OpenAPI schema.
      const result = await processWayl(req);

      // The Gateway standardizes the response back to Nexus
      if (!result.success) {
        return { success: false, provider: 'wayl', error: result.error };
      }

      return {
        success: true,
        provider: 'wayl',
        checkoutUrl: result.data.url,       // The link the user clicks
        transactionId: result.data.id,      // Wayl's internal tracking ID
      };
    }

    case 'zaincash': {
      // return await processZainCash(req);
      return { success: false, provider: 'zaincash', error: 'Engine offline.' };
    }

    default:
      console.error(`[PAYMENTS GATEWAY] Unknown provider requested: ${targetProvider}`);
      return { 
        success: false, 
        provider: targetProvider, 
        error: 'Invalid payment provider requested.' 
      };
  }
}
