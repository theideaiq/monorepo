// ==========================================
// 1. CONFIGURATION & LIFECYCLE ENUMS
// ==========================================

/**
 * WaylEnvironment
 *
 * @description Standardized execution for WaylEnvironment.
 */
export type WaylEnvironment = 'live' | 'test';

/**
 * Valid states for a Wayl payment link lifecycle
 */
export type WaylLinkStatus =
  | 'Created'
  | 'Pending'
  | 'Processing'
  | 'Complete'
  | 'Delivered'
  | 'Cancelled'
  | 'Rejected'
  | 'Returned';

/**
 * Valid states for a Wayl refund request lifecycle
 */
export type WaylRefundStatus = 'Requested' | 'Refunded' | 'Rejected' | 'Cancelled';

// ==========================================
// 2. LINE ITEM & COMPONENT SCHEMAS
// ==========================================

/**
 * WaylLineItem
 *
 * @description Standardized execution for WaylLineItem.
 */
export interface WaylLineItem {
  label: string;
  /** Amount in Iraqi Dinar (IQD) */
  amount: number;
  /** 'increase' adds to total; 'decrease' subtracts (e.g. discount vouchers) */
  type: 'increase' | 'decrease';
}

// ==========================================
// 3. PAYMENT LINK SCHEMAS (CREATION & RESPONSES)
// ==========================================

/**
 * WaylLinkCreationPayload
 *
 * @description Standardized execution for WaylLinkCreationPayload.
 */
export interface WaylLinkCreationPayload {
  env: WaylEnvironment;
  /** Max 255 characters. Must be globally unique across all your store links. */
  referenceId: string;
  /** Total value in IQD. Minimum 1000. Must equal the net sum of line items. */
  total: number;
  /** Currently only 'IQD' is supported by Wayl. */
  currency: 'IQD';
  /** Optional custom tracking metadata or internal identifier tag. */
  customParameter?: string;
  /** Optional breakdown of individual cart/receipt components. */
  lineItem?: WaylLineItem[];
  /** Target endpoint for server-to-server status update POST notifications. */
  webhookUrl?: string;
  /** 10-255 characters random token used to compute cryptographic verification headers. */
  webhookSecret?: string;
  /** Redirect target page following checkout processing. Appends query tokens. */
  redirectionUrl?: string;
}

/**
 * WaylLinkRecord
 *
 * @description Standardized execution for WaylLinkRecord.
 */
export interface WaylLinkRecord {
  id: string;
  code: string;
  referenceId: string;
  /** Total captured value returned explicitly as a string by the Wayl ledger. */
  total: string;
  currency: 'IQD';
  type: 'standard' | string;
  /** Remains null until checkout payment authorization executes successfully. */
  paymentMethod: 'Card' | string | null;
  status: WaylLinkStatus;
  /** ISO-8601 string or null if uncompleted or pending capture. */
  completedAt: string | null;
  /** ISO-8601 link initialization timestamp. */
  createdAt: string;
  /** ISO-8601 database mutation timestamp. */
  updatedAt: string;
  /** Hosted checkout redirect endpoint presented directly to the payer. */
  url: string;
  webhookUrl?: string;
  redirectionUrl?: string;
  customParameter?: string | null;
}

// ==========================================
// 4. REFUNDS SCHEMAS
// ==========================================

/**
 * WaylRefundRecord
 *
 * @description Standardized execution for WaylRefundRecord.
 */
export interface WaylRefundRecord {
  id: string;
  linkId: string;
  referenceId: string;
  /** Value designated to refund back to consumer account in IQD. */
  amount: number;
  /** Compliance check reason explaining reversal request. Min 100 chars. */
  reason: string;
  initiatedBy: 'Merchant' | string;
  status: WaylRefundStatus;
}

// ==========================================
// 5. WEBHOOK EVENT SCHEMAS
// ==========================================

/**
 * WaylWebhookCustomer
 *
 * @description Standardized execution for WaylWebhookCustomer.
 */
export interface WaylWebhookCustomer {
  id: string;
  name: string;
  phone: string;
  city: string;
  country: string;
  address: string;
}

/**
 * WaylWebhookEvent
 *
 * @description Standardized execution for WaylWebhookEvent.
 */
export interface WaylWebhookEvent {
  id: string;
  verb: 'POST' | string;
  event: 'order.created' | 'order.updated' | string;
  referenceId: string;
  paymentMethod: string;
  paymentStatus: WaylLinkStatus | string;
  paymentProcessor: string;
  total: number;
  commission: number;
  code: string;
  customer: WaylWebhookCustomer;
  items: WaylLineItem[];
}
