import type {
  OrderStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "@repo/database";

/**
 * Who pays: a customer organization (business plans) or a single user (The IDEA
 * Plus memberships and store orders).
 */
export type BillingOwner =
  | { organizationId: string; userId?: undefined }
  | { organizationId?: undefined; userId: string };

export interface PlanRecord {
  active: boolean;
  amount: number;
  billingInterval: "month" | "year";
  currency: string;
  id: string;
  name: string;
}

export interface SubscriptionRecord {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  id: string;
  /** The plan it switches to at the next renewal (The IDEA Plus). */
  nextPlanId: string | null;
  organizationId: string | null;
  planId: string;
  status: SubscriptionStatus;
  userId: string | null;
}

export interface PaymentRecord {
  amount: number;
  currency: string;
  id: string;
  /** Free-form data kept with the payment, e.g. ad attribution. */
  metadata: Record<string, unknown>;
  /** The store order this payment is for, if any. */
  orderId: string | null;
  organizationId: string | null;
  provider: string;
  referenceId: string;
  status: PaymentStatus;
  subscriptionId: string | null;
  userId: string | null;
}

export interface NewPayment {
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
  orderId?: string | null;
  organizationId: string | null;
  provider: string;
  referenceId: string;
  subscriptionId: string | null;
  userId: string | null;
}

export interface OrderRecord {
  /** A 13–17-year-old's order waiting for (or declined by) their guardian. */
  awaitingGuardian?: boolean;
  currency: string;
  id: string;
  /** One receipt line per order item (unit price × quantity), then delivery. */
  lines: { amount: number; label: string }[];
  /** Human-friendly order number shown on receipts. */
  number: number;
  status: OrderStatus;
  total: number;
  userId: string | null;
}

export interface PaymentUpdate {
  checkoutUrl?: string | null;
  paidAt?: Date;
  paymentMethod?: string | null;
  providerPaymentId?: string;
  status?: PaymentStatus;
}

export interface SubscriptionUpdate {
  currentPeriodEnd?: Date;
  currentPeriodStart?: Date;
  /** Null clears it. */
  nextPlanId?: string | null;
  planId?: string;
  status?: SubscriptionStatus;
}

/**
 * Persistence used by the billing service. The Supabase implementation runs
 * with the secret key; tests use an in-memory one.
 */
export interface BillingRepository {
  /** Marks a store order paid and takes its items out of stock (idempotent). */
  completeOrderPayment: (orderId: string) => Promise<void>;
  createPayment: (payment: NewPayment) => Promise<PaymentRecord>;
  createSubscription: (input: {
    owner: BillingOwner;
    planId: string;
    provider: string;
  }) => Promise<SubscriptionRecord>;
  /** Active or past-due subscriptions whose period ends before `date`. */
  findSubscriptionsDueBefore: (date: Date) => Promise<SubscriptionRecord[]>;
  getLiveSubscription: (
    owner: BillingOwner
  ) => Promise<SubscriptionRecord | null>;
  getOrder: (orderId: string) => Promise<OrderRecord | null>;
  getPaymentByReference: (referenceId: string) => Promise<PaymentRecord | null>;
  /** An unpaid checkout already opened for the order, to reuse. */
  getPendingOrderPayment: (
    orderId: string
  ) => Promise<{ checkoutUrl: string; referenceId: string } | null>;
  getPlan: (planId: string) => Promise<PlanRecord | null>;
  getSubscription: (id: string) => Promise<SubscriptionRecord | null>;
  /** True when the subscription already has an unpaid invoice. */
  hasPendingPayment: (subscriptionId: string) => Promise<boolean>;
  markWebhookProcessed: (eventId: number) => Promise<void>;
  /** Stores a webhook delivery; returns null if it was already recorded. */
  recordWebhookEvent: (event: {
    eventKey: string;
    payload: unknown;
    provider: string;
    referenceId: string;
  }) => Promise<number | null>;
  updatePayment: (referenceId: string, update: PaymentUpdate) => Promise<void>;
  updateSubscription: (id: string, update: SubscriptionUpdate) => Promise<void>;
}
