// packages/payments/src/types.ts

/**
 * PaymentProvider
 *
 * @description Standardized execution for PaymentProvider.
 */
export type PaymentProvider = 'wayl' | 'zaincash' | 'stripe' | 'superqi';

/**
 * UniversalCheckoutRequest
 *
 * @description Standardized execution for UniversalCheckoutRequest.
 */
export interface UniversalCheckoutRequest {
  amountIQD: number;
  referenceId: string;       
  successUrl: string;
  customerName?: string;
}

/**
 * UniversalCheckoutResponse
 *
 * @description Standardized execution for UniversalCheckoutResponse.
 */
export interface UniversalCheckoutResponse {
  success: boolean;
  provider: PaymentProvider;
  checkoutUrl?: string;
  transactionId?: string;
  error?: string;
}
