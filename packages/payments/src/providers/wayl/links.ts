import { waylRequest } from './client';
import type { UniversalCheckoutRequest } from '../../types';
import type { 
  WaylLinkCreationPayload, 
  WaylLinkRecord, 
  WaylLinkStatus 
} from './types';
import { env } from '@auibsal/env';

/**
 * Validates authentication credentials directly against Wayl's validation sequence.
 *
 * @returns {Promise<boolean>} True if authentication is successful, false otherwise.
 * @example
 * const isValid = await verifyAuthKey();
 * if (!isValid) throw new Error('Invalid Wayl auth key');
 */
export async function verifyAuthKey(): Promise<boolean> {
  const result = await waylRequest<Record<string, never>>('/api/v1/verify-auth-key', { method: 'GET' });
  return result.success;
}

/**
 * Translates a Universal Checkout Request into Wayl's strictly typed schema,
 * then executes the creation sequence.
 *
 * @param {UniversalCheckoutRequest} req - The universal checkout request details.
 * @returns {Promise<{success: boolean, error?: string, data?: WaylLinkRecord}>} The result of the payment link creation.
 * @example
 * const result = await createPaymentLink({
 *   amountIQD: 5000,
 *   referenceId: 'order_123',
 *   successUrl: 'https://example.com/success'
 * });
 */
export async function createPaymentLink(req: UniversalCheckoutRequest) {
  if (req.amountIQD < 1000) {
    return { success: false as const, error: 'Minimum transaction boundary is 1,000 IQD.' };
  }

  // 1. Translate Universal -> Wayl Payload
  const body: WaylLinkCreationPayload = {
    env: env.WAYL_ENV === 'live' ? 'live' : 'test',
    referenceId: req.referenceId,
    total: req.amountIQD,
    currency: 'IQD',
    customParameter: req.customerName || '',
    lineItem: [
      {
        label: 'Basket Value',
        amount: req.amountIQD,
        type: 'increase',
      }
    ],
    redirectionUrl: req.successUrl,
    webhookUrl: env.WAYL_WEBHOOK_URL || '',
    webhookSecret: env.WAYL_WEBHOOK_SECRET || '',
  };

  // 2. Execute the Wayl-specific request
  return await waylRequest<WaylLinkRecord>('/api/v1/links', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Fetches a single link object by your internal unique reference configuration.
 *
 * @param {string} referenceId - The unique reference ID of the payment link.
 * @returns {Promise<{success: boolean, data?: WaylLinkRecord}>} The fetched link data.
 * @example
 * const link = await getLinkByReference('order_123');
 */
export async function getLinkByReference(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}`, { method: 'GET' });
}

/**
 * Retrieves a historical paginated matrix of created links filtered by status.
 *
 * @param {{ take?: number; skip?: number; statuses?: WaylLinkStatus[] }} params - Optional pagination and filtering parameters.
 * @returns {Promise<{success: boolean, data?: WaylLinkRecord[]}>} The list of payment links.
 * @example
 * const links = await getLinks({ take: 10, skip: 0, statuses: ['created'] });
 */
export async function getLinks(params: { take?: number; skip?: number; statuses?: WaylLinkStatus[] } = {}) {
  const query = new URLSearchParams();
  if (params.take) query.set('take', String(params.take));
  if (params.skip) query.set('skip', String(params.skip));
  if (params.statuses) {
    for (const status of params.statuses) {
      query.append('statuses', status);
    }
  }

  const path = `/api/v1/links?${query.toString()}`;
  return await waylRequest<WaylLinkRecord[]>(path, { method: 'GET' });
}

/**
 * Hard-invalidates an uncaptured link asset immediately.
 *
 * @param {string} referenceId - The unique reference ID of the payment link to invalidate.
 * @returns {Promise<{success: boolean, data?: WaylLinkRecord}>} The invalidated link data.
 * @example
 * await invalidateLink('order_123');
 */
export async function invalidateLink(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate`, { method: 'POST' });
}

/**
 * Conditionally invalidates an asset only if it resides in a pending evaluation state.
 *
 * @param {string} referenceId - The unique reference ID of the payment link to invalidate if pending.
 * @returns {Promise<{success: boolean, data?: WaylLinkRecord}>} The conditionally invalidated link data.
 * @example
 * await invalidateLinkIfPending('order_123');
 */
export async function invalidateLinkIfPending(referenceId: string) {
  return await waylRequest<WaylLinkRecord>(`/api/v1/links/${referenceId}/invalidate-if-pending`, { method: 'POST' });
}
