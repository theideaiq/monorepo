import { randomUUID } from "node:crypto";
import type {
  BillingOwner,
  BillingRepository,
  OrderRecord,
  PaymentRecord,
  PlanRecord,
  SubscriptionRecord,
} from "./repository";

const ownedBy = (subscription: SubscriptionRecord, owner: BillingOwner) =>
  owner.userId
    ? subscription.userId === owner.userId
    : subscription.organizationId === owner.organizationId;

/** In-memory BillingRepository for tests. */
export const createMemoryBillingRepository = (
  plans: PlanRecord[] = [],
  orders: OrderRecord[] = []
) => {
  const state = {
    /** Gifted Plus months left, by user. */
    giftMonths: new Map<string, number>(),
    orders: new Map(orders.map((order) => [order.id, { ...order }])),
    payments: new Map<
      string,
      PaymentRecord & { checkoutUrl?: string | null }
    >(),
    plans: new Map(plans.map((plan) => [plan.id, plan])),
    /** Bulbs chosen for the next renewal, by subscription. */
    renewalBulbs: new Map<string, number>(),
    /** Bulbs spent on renewals, by subscription. */
    spentBulbs: new Map<string, number>(),
    subscriptions: new Map<string, SubscriptionRecord>(),
    webhookEvents: new Map<string, { id: number; processed: boolean }>(),
  };

  const repository: BillingRepository = {
    completeOrderPayment(orderId) {
      const order = state.orders.get(orderId);
      if (order?.status === "pending") {
        order.status = "paid";
      }
      return Promise.resolve();
    },
    createPayment(payment) {
      const record: PaymentRecord = {
        amount: payment.amount,
        currency: payment.currency,
        id: randomUUID(),
        metadata: payment.metadata ?? {},
        orderId: payment.orderId ?? null,
        organizationId: payment.organizationId,
        provider: payment.provider,
        referenceId: payment.referenceId,
        status: "pending",
        subscriptionId: payment.subscriptionId,
        userId: payment.userId,
      };
      state.payments.set(record.referenceId, record);
      return Promise.resolve(record);
    },
    createSubscription({ owner, planId }) {
      const record: SubscriptionRecord = {
        cancelAtPeriodEnd: false,
        currentPeriodEnd: null,
        currentPeriodStart: null,
        id: randomUUID(),
        nextPlanId: null,
        organizationId: owner.organizationId ?? null,
        planId,
        status: "incomplete",
        userId: owner.userId ?? null,
      };
      state.subscriptions.set(record.id, record);
      return Promise.resolve(record);
    },
    findSubscriptionsDueBefore(date) {
      return Promise.resolve(
        [...state.subscriptions.values()].filter(
          (subscription) =>
            ["active", "past_due"].includes(subscription.status) &&
            subscription.currentPeriodEnd !== null &&
            subscription.currentPeriodEnd <= date
        )
      );
    },
    getLiveSubscription(owner) {
      return Promise.resolve(
        [...state.subscriptions.values()].find(
          (subscription) =>
            ownedBy(subscription, owner) &&
            ["incomplete", "active", "past_due"].includes(subscription.status)
        ) ?? null
      );
    },
    getOrder(orderId) {
      return Promise.resolve(state.orders.get(orderId) ?? null);
    },
    getPaymentByReference(referenceId) {
      return Promise.resolve(state.payments.get(referenceId) ?? null);
    },
    getPendingOrderPayment(orderId) {
      const payment = [...state.payments.values()].find(
        (candidate) =>
          candidate.orderId === orderId &&
          candidate.status === "pending" &&
          candidate.checkoutUrl
      );
      return Promise.resolve(
        payment?.checkoutUrl
          ? {
              checkoutUrl: payment.checkoutUrl,
              referenceId: payment.referenceId,
            }
          : null
      );
    },
    getPlan(planId) {
      return Promise.resolve(state.plans.get(planId) ?? null);
    },
    getSubscription(id) {
      return Promise.resolve(state.subscriptions.get(id) ?? null);
    },
    hasPendingPayment(subscriptionId) {
      return Promise.resolve(
        [...state.payments.values()].some(
          (payment) =>
            payment.subscriptionId === subscriptionId &&
            payment.status === "pending"
        )
      );
    },
    markWebhookProcessed(eventId) {
      for (const event of state.webhookEvents.values()) {
        if (event.id === eventId) {
          event.processed = true;
        }
      }
      return Promise.resolve();
    },
    recordWebhookEvent({ eventKey, provider }) {
      const key = `${provider}:${eventKey}`;
      if (state.webhookEvents.has(key)) {
        return Promise.resolve(null);
      }
      const id = state.webhookEvents.size + 1;
      state.webhookEvents.set(key, { id, processed: false });
      return Promise.resolve(id);
    },
    renewalBulbs(subscriptionId) {
      return Promise.resolve(state.renewalBulbs.get(subscriptionId) ?? 0);
    },
    spendGiftMonth(subscriptionId) {
      const subscription = state.subscriptions.get(subscriptionId);
      const left = state.giftMonths.get(subscription?.userId ?? "") ?? 0;
      if (!subscription?.userId || left === 0) {
        return Promise.resolve(false);
      }
      state.giftMonths.set(subscription.userId, left - 1);
      const base = subscription.currentPeriodEnd ?? new Date();
      const end = new Date(base);
      end.setUTCMonth(end.getUTCMonth() + 1);
      state.subscriptions.set(subscriptionId, {
        ...subscription,
        currentPeriodEnd: end,
        currentPeriodStart: base,
        status: "active",
      });
      return Promise.resolve(true);
    },
    spendRenewalBulbs(subscriptionId, bulbs) {
      state.spentBulbs.set(
        subscriptionId,
        (state.spentBulbs.get(subscriptionId) ?? 0) + bulbs
      );
      state.renewalBulbs.delete(subscriptionId);
      return Promise.resolve();
    },
    updatePayment(referenceId, update) {
      const payment = state.payments.get(referenceId);
      if (payment) {
        state.payments.set(referenceId, {
          ...payment,
          ...(update.status ? { status: update.status } : {}),
          checkoutUrl: update.checkoutUrl ?? payment.checkoutUrl,
        });
      }
      return Promise.resolve();
    },
    updateSubscription(id, update) {
      const subscription = state.subscriptions.get(id);
      if (subscription) {
        state.subscriptions.set(id, {
          ...subscription,
          ...Object.fromEntries(
            Object.entries(update).filter(([, value]) => value !== undefined)
          ),
        });
      }
      return Promise.resolve();
    },
  };

  return { repository, state };
};
