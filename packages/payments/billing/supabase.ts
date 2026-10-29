import type { Json, Tables } from "@repo/database";
import type { AdminClient } from "@repo/database/admin";
import type {
  BillingOwner,
  BillingRepository,
  PaymentRecord,
  SubscriptionRecord,
} from "./repository";

// Postgres unique_violation: the webhook delivery was already recorded.
const UNIQUE_VIOLATION = "23505";

const toDate = (value: string | null) => (value ? new Date(value) : null);

const isRecord = (value: Json): value is Record<string, Json | undefined> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toSubscription = (row: Tables<"subscriptions">): SubscriptionRecord => ({
  cancelAtPeriodEnd: row.cancel_at_period_end,
  currentPeriodEnd: toDate(row.current_period_end),
  currentPeriodStart: toDate(row.current_period_start),
  id: row.id,
  nextPlanId: row.next_plan_id,
  organizationId: row.organization_id,
  planId: row.plan_id,
  status: row.status,
  userId: row.user_id,
});

const ownerColumn = (owner: BillingOwner) =>
  owner.userId === undefined
    ? ({ column: "organization_id", value: owner.organizationId } as const)
    : ({ column: "user_id", value: owner.userId } as const);

const toPayment = (row: Tables<"payments">): PaymentRecord => ({
  amount: row.amount,
  currency: row.currency,
  id: row.id,
  metadata: isRecord(row.metadata) ? row.metadata : {},
  orderId: row.order_id,
  organizationId: row.organization_id,
  provider: row.provider,
  referenceId: row.reference_id,
  status: row.status,
  subscriptionId: row.subscription_id,
  userId: row.user_id,
});

interface Result {
  data: unknown;
  error: { message: string } | null;
}

const check = (error: { message: string } | null) => {
  if (error) {
    throw new Error(error.message);
  }
};

/** Data that must exist (insert … select, list queries). */
const unwrap = <R extends Result>({ data, error }: R) => {
  check(error);
  if (data === null) {
    throw new Error("Supabase returned no data");
  }
  return data as NonNullable<R["data"]>;
};

/** Data that may be absent (maybeSingle). */
const unwrapOptional = <R extends Result>({ data, error }: R) => {
  check(error);
  return data as R["data"];
};

/** Billing persistence backed by Supabase (secret key, bypasses RLS). */
export const createSupabaseBillingRepository = (
  supabase: AdminClient
): BillingRepository => ({
  async completeOrderPayment(orderId) {
    const { error } = await supabase.rpc("complete_order_payment", {
      order_id: orderId,
    });
    check(error);
  },
  async createPayment(payment) {
    const row = unwrap(
      await supabase
        .from("payments")
        .insert({
          amount: payment.amount,
          currency: payment.currency,
          description: payment.description,
          metadata: (payment.metadata ?? {}) as NonNullable<Json>,
          order_id: payment.orderId ?? null,
          organization_id: payment.organizationId,
          provider: payment.provider,
          reference_id: payment.referenceId,
          subscription_id: payment.subscriptionId,
          user_id: payment.userId,
        })
        .select()
        .single()
    );
    return toPayment(row);
  },

  async createSubscription({ owner, planId, provider }) {
    const row = unwrap(
      await supabase
        .from("subscriptions")
        .insert({
          organization_id: owner.organizationId ?? null,
          plan_id: planId,
          provider,
          user_id: owner.userId ?? null,
        })
        .select()
        .single()
    );
    return toSubscription(row);
  },

  async findSubscriptionsDueBefore(date) {
    const rows = unwrap(
      await supabase
        .from("subscriptions")
        .select()
        .in("status", ["active", "past_due"])
        // Company-paid The IDEA Plus renews by invoice (run_plus_seat_renewals).
        .neq("provider", "company")
        .lte("current_period_end", date.toISOString())
    );
    return rows.map(toSubscription);
  },

  async getLiveSubscription(owner) {
    const { column, value } = ownerColumn(owner);
    const row = unwrapOptional(
      await supabase
        .from("subscriptions")
        .select()
        .eq(column, value)
        .in("status", ["incomplete", "active", "past_due"])
        .maybeSingle()
    );
    return row ? toSubscription(row) : null;
  },

  async getOrder(orderId) {
    const row = unwrapOptional(
      await supabase
        .from("orders")
        .select(
          "id, number, user_id, status, guardian_status, total, currency, shipping_fee, order_items (name_en, unit_price, quantity, variant:product_variants (label_en))"
        )
        .eq("id", orderId)
        .maybeSingle()
    );
    if (!row) {
      return null;
    }
    const lines = row.order_items.map((item) => {
      // "Adele – 21 (Vinyl)" when the line names a version.
      const name = item.variant?.label_en
        ? `${item.name_en} (${item.variant.label_en})`
        : item.name_en;
      return {
        amount: item.unit_price * item.quantity,
        label: item.quantity > 1 ? `${name} × ${item.quantity}` : name,
      };
    });
    if (row.shipping_fee > 0) {
      lines.push({ amount: row.shipping_fee, label: "Delivery" });
    }
    return {
      awaitingGuardian:
        row.guardian_status === "pending" || row.guardian_status === "declined",
      currency: row.currency,
      id: row.id,
      lines,
      number: row.number,
      status: row.status,
      total: row.total,
      userId: row.user_id,
    };
  },

  async getPaymentByReference(referenceId) {
    const row = unwrapOptional(
      await supabase
        .from("payments")
        .select()
        .eq("reference_id", referenceId)
        .maybeSingle()
    );
    return row ? toPayment(row) : null;
  },

  async getPendingOrderPayment(orderId) {
    const row = unwrapOptional(
      await supabase
        .from("payments")
        .select("reference_id, checkout_url")
        .eq("order_id", orderId)
        .eq("status", "pending")
        .not("checkout_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    return row?.checkout_url
      ? { checkoutUrl: row.checkout_url, referenceId: row.reference_id }
      : null;
  },

  async getPlan(planId) {
    const row = unwrapOptional(
      await supabase.from("plans").select().eq("id", planId).maybeSingle()
    );
    return row
      ? {
          active: row.active,
          amount: row.amount,
          billingInterval: row.billing_interval,
          currency: row.currency,
          id: row.id,
          name: row.name,
        }
      : null;
  },

  async getSubscription(id) {
    const row = unwrapOptional(
      await supabase.from("subscriptions").select().eq("id", id).maybeSingle()
    );
    return row ? toSubscription(row) : null;
  },

  async hasPendingPayment(subscriptionId) {
    const { count, error } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("subscription_id", subscriptionId)
      .eq("status", "pending");
    check(error);
    return (count ?? 0) > 0;
  },

  async markWebhookProcessed(eventId) {
    const { error } = await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("id", eventId);
    check(error);
  },

  async recordWebhookEvent({ eventKey, payload, provider, referenceId }) {
    const { data, error } = await supabase
      .from("webhook_events")
      .insert({
        event_key: eventKey,
        payload: payload as Tables<"webhook_events">["payload"],
        provider,
        reference_id: referenceId,
      })
      .select("id")
      .single();

    if (error?.code === UNIQUE_VIOLATION) {
      return null;
    }
    return unwrap({ data, error }).id;
  },

  async renewalBulbs(subscriptionId) {
    const { data, error } = await supabase.rpc("plus_renewal_bulbs", {
      subscription: subscriptionId,
    });
    check(error);
    return data ?? 0;
  },

  async spendGiftMonth(subscriptionId) {
    const { data, error } = await supabase.rpc("use_plus_gift_month", {
      subscription: subscriptionId,
    });
    check(error);
    return data === true;
  },

  async spendRenewalBulbs(subscriptionId, bulbs) {
    const { error } = await supabase.rpc("spend_renewal_bulbs", {
      bulbs,
      subscription: subscriptionId,
    });
    check(error);
  },

  async updatePayment(referenceId, update) {
    const { error } = await supabase
      .from("payments")
      .update({
        checkout_url: update.checkoutUrl,
        paid_at: update.paidAt?.toISOString(),
        payment_method: update.paymentMethod,
        provider_payment_id: update.providerPaymentId,
        status: update.status,
      })
      .eq("reference_id", referenceId);
    check(error);
  },

  async updateSubscription(id, update) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        current_period_end: update.currentPeriodEnd?.toISOString(),
        current_period_start: update.currentPeriodStart?.toISOString(),
        next_plan_id: update.nextPlanId,
        plan_id: update.planId,
        status: update.status,
      })
      .eq("id", id);
    check(error);
  },
});
