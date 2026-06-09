import { waylRequest } from './client';
// 🛠️ CORRECTED: Importing strictly from the local provider types
import type { WaylRefundRecord } from './types';

/**
 * Launches a transaction reversal against an explicitly captured reference identifier
 */
export async function initiateRefund(params: { referenceId: string; amount: number; reason: string }) {
  if (!params.reason || params.reason.length < 100 || params.reason.length > 1500) {
    return {
      success: false,
      error: `Compliance Error: Refund reasons must be between 100 and 1,500 characters. Provided string length: ${params.reason.length}`,
    };
  }

  const body = {
    referenceId: params.referenceId,
    amount: params.amount,
    reason: params.reason,
  };

  return await waylRequest<WaylRefundRecord>('/api/v1/refunds', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Pulls list entries for refund items logged to the merchant portal
 */
export async function getRefunds() {
  return await waylRequest<WaylRefundRecord[]>('/api/v1/refunds', { method: 'GET' });
}

/**
 * Targets and pulls down an isolated refund transaction card matching its internal token
 */
export async function getRefundById(refundId: string) {
  return await waylRequest<WaylRefundRecord>(`/api/v1/refunds/${refundId}`, { method: 'GET' });
}

/**
 * Cancels an unexecuted refund transaction sequence
 */
export async function cancelRefund(refundId: string) {
  return await waylRequest<Record<string, never>>(`/api/v1/refunds/${refundId}/cancel`, { method: 'DELETE' });
}
