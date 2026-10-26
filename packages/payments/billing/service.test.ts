import { describe, expect, test } from "vitest";
import { createMockProvider } from "../providers/mock";
import { WebhookVerificationError } from "../types";
import { createMemoryBillingRepository } from "./memory";
import type { OrderRecord, PlanRecord } from "./repository";
import {
  addInterval,
  canTransition,
  createBillingService,
  OrderNotPayableError,
} from "./service";

const plan: PlanRecord = {
  active: true,
  amount: 25_000,
  billingInterval: "month",
  currency: "IQD",
  id: "pro-monthly",
  name: "Pro",
};

const order: OrderRecord = {
  currency: "IQD",
  id: "order-1",
  lines: [
    { amount: 700_000, label: "PS5" },
    { amount: 5000, label: "Delivery" },
  ],
  number: 10_001,
  status: "pending",
  total: 705_000,
  userId: "user-1",
};

const setup = (now = new Date("2026-10-03T12:00:00Z")) => {
  const { repository, state } = createMemoryBillingRepository(
    [
      plan,
      { ...plan, active: false, id: "retired" },
      { ...plan, amount: 39_750, id: "bigger" },
    ],
    [order]
  );
  const provider = createMockProvider();
  let clock = now;
  const billing = createBillingService({
    now: () => clock,
    provider,
    repository,
    webhookUrl: "https://api.example.iq/webhooks/payments",
  });

  return {
    billing,
    provider,
    setNow: (date: Date) => {
      clock = date;
    },
    state,
  };
};

describe("billing", () => {
  test("adds billing intervals in UTC and clamps month ends", () => {
    expect(
      addInterval(new Date("2026-01-31T00:00:00Z"), "month").toISOString()
    ).toBe("2026-02-28T00:00:00.000Z");
    expect(
      addInterval(new Date("2028-02-29T10:00:00Z"), "year").toISOString()
    ).toBe("2029-02-28T10:00:00.000Z");
  });

  test("only allows forward payment transitions", () => {
    expect(canTransition("pending", "paid")).toBe(true);
    expect(canTransition("paid", "refunded")).toBe(true);
    expect(canTransition("paid", "pending")).toBe(false);
    expect(canTransition("failed", "paid")).toBe(false);
  });

  test("starts a checkout for a plan", async () => {
    const { billing, state } = setup();
    const { referenceId, url } = await billing.startCheckout({
      owner: { organizationId: "org-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });

    expect(url).toContain(referenceId);
    expect(state.payments.get(referenceId)).toMatchObject({
      amount: 25_000,
      currency: "IQD",
      status: "pending",
    });
    expect([...state.subscriptions.values()]).toMatchObject([
      { organizationId: "org-1", planId: "pro-monthly", status: "incomplete" },
    ]);
  });

  test("refuses inactive plans", async () => {
    const { billing } = setup();
    await expect(
      billing.startCheckout({
        owner: { organizationId: "o" },
        planId: "retired",
        userId: "u",
      })
    ).rejects.toThrow("not available");
  });

  test("a paid webhook activates the subscription exactly once", async () => {
    const { billing, provider, state } = setup();
    const attribution = { fbp: "fb.1.1.1", userAgent: "Mozilla/5.0" };
    const { referenceId } = await billing.startCheckout({
      metadata: { attribution },
      owner: { organizationId: "org-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });

    const delivery = provider.settle(referenceId, "paid");
    const outcome = await billing.handleWebhook(delivery);

    expect(outcome).toMatchObject({
      from: "pending",
      // Checkout metadata reaches the webhook for conversion reporting.
      payment: { metadata: { attribution } },
      status: "processed",
      to: "paid",
    });
    const [subscription] = [...state.subscriptions.values()];
    expect(subscription).toMatchObject({ status: "active" });
    expect(subscription?.currentPeriodEnd?.toISOString()).toBe(
      "2026-11-03T12:00:00.000Z"
    );

    // Providers retry deliveries; the second one must change nothing.
    expect(await billing.handleWebhook(delivery)).toEqual({
      status: "duplicate",
    });
    expect(
      [...state.subscriptions.values()][0]?.currentPeriodEnd?.toISOString()
    ).toBe("2026-11-03T12:00:00.000Z");
  });

  test("rejects forged webhooks", async () => {
    const { billing } = setup();
    await expect(
      billing.handleWebhook({
        headers: new Headers({ "x-mock-signature": "forged" }),
        rawBody: JSON.stringify({ referenceId: "x", status: "paid" }),
      })
    ).rejects.toThrow(WebhookVerificationError);
  });

  test("ignores webhooks for unknown payments", async () => {
    const { billing, provider } = setup();
    await provider.createCheckout({
      amount: { amount: 5000, currency: "IQD" },
      referenceId: "not-ours",
    });
    expect(
      await billing.handleWebhook(provider.settle("not-ours", "paid"))
    ).toEqual({
      reason: "unknown-payment",
      status: "ignored",
    });
  });

  test("never accepts a different amount than invoiced", async () => {
    const { billing, provider, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { organizationId: "org-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    const checkout = await provider.getCheckout(referenceId);
    checkout.amount = { amount: 1000, currency: "IQD" };

    const outcome = await billing.handleWebhook(
      provider.settle(referenceId, "paid")
    );

    expect(outcome).toMatchObject({ to: "failed" });
    expect(state.payments.get(referenceId)?.status).toBe("failed");
    expect([...state.subscriptions.values()][0]?.status).toBe("incomplete");
  });

  test("invoices renewals before the period ends, once", async () => {
    const { billing, provider, setNow, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { organizationId: "org-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    await billing.handleWebhook(provider.settle(referenceId, "paid"));

    setNow(new Date("2026-11-01T06:00:00Z"));
    const first = await billing.issueRenewals();
    expect(first.invoices).toHaveLength(1);
    expect(await billing.issueRenewals()).toMatchObject({ invoices: [] });

    // Paying the renewal early extends from the end of the current period.
    const [invoice] = first.invoices;
    await billing.handleWebhook(
      provider.settle(invoice?.referenceId ?? "", "paid")
    );
    expect(
      [...state.subscriptions.values()][0]?.currentPeriodEnd?.toISOString()
    ).toBe("2026-12-03T12:00:00.000Z");
  });

  test("marks overdue subscriptions past due, then expires them", async () => {
    const { billing, provider, setNow, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { organizationId: "org-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    await billing.handleWebhook(provider.settle(referenceId, "paid"));

    setNow(new Date("2026-11-05T00:00:00Z"));
    expect(await billing.issueRenewals()).toMatchObject({ pastDue: 1 });
    expect([...state.subscriptions.values()][0]?.status).toBe("past_due");

    setNow(new Date("2026-11-20T00:00:00Z"));
    expect(await billing.issueRenewals()).toMatchObject({ expired: 1 });
    expect([...state.subscriptions.values()][0]?.status).toBe("expired");
  });

  test("a plan change applies from the next renewal", async () => {
    const { billing, provider, setNow, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { userId: "user-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    await billing.handleWebhook(provider.settle(referenceId, "paid"));
    const [subscription] = [...state.subscriptions.values()];
    if (subscription) {
      state.subscriptions.set(subscription.id, {
        ...subscription,
        nextPlanId: "bigger",
      });
    }

    setNow(new Date("2026-11-01T06:00:00Z"));
    const { invoices } = await billing.issueRenewals();
    expect(invoices).toMatchObject([{ amount: 39_750 }]);
    expect([...state.subscriptions.values()][0]).toMatchObject({
      nextPlanId: null,
      planId: "bigger",
    });
  });

  test("a cancelled subscription ends with its paid period", async () => {
    const { billing, provider, setNow, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { userId: "user-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    await billing.handleWebhook(provider.settle(referenceId, "paid"));
    const [subscription] = [...state.subscriptions.values()];
    if (subscription) {
      state.subscriptions.set(subscription.id, {
        ...subscription,
        cancelAtPeriodEnd: true,
      });
    }

    setNow(new Date("2026-11-01T06:00:00Z"));
    expect(await billing.issueRenewals()).toMatchObject({ invoices: [] });
    setNow(new Date("2026-11-04T06:00:00Z"));
    expect(await billing.issueRenewals()).toMatchObject({ expired: 1 });
    expect([...state.subscriptions.values()][0]?.status).toBe("canceled");
  });

  test("individual users subscribe on their own", async () => {
    const { billing, provider, state } = setup();
    const { referenceId } = await billing.startCheckout({
      owner: { userId: "user-1" },
      planId: "pro-monthly",
      userId: "user-1",
    });
    await billing.handleWebhook(provider.settle(referenceId, "paid"));

    expect([...state.subscriptions.values()]).toMatchObject([
      { organizationId: null, status: "active", userId: "user-1" },
    ]);
    expect(state.payments.get(referenceId)).toMatchObject({
      organizationId: null,
      userId: "user-1",
    });
  });

  test("pays a store order for its stored total, once", async () => {
    const { billing, provider, state } = setup();
    const first = await billing.startOrderCheckout({
      orderId: "order-1",
      userId: "user-1",
    });
    // Reopening the checkout reuses the same link instead of a second one.
    const again = await billing.startOrderCheckout({
      orderId: "order-1",
      userId: "user-1",
    });
    expect(again.referenceId).toBe(first.referenceId);
    expect(state.payments.get(first.referenceId)).toMatchObject({
      amount: 705_000,
      orderId: "order-1",
    });

    await billing.handleWebhook(provider.settle(first.referenceId, "paid"));
    expect(state.orders.get("order-1")?.status).toBe("paid");

    await expect(
      billing.startOrderCheckout({ orderId: "order-1", userId: "user-1" })
    ).rejects.toThrow(OrderNotPayableError);
  });

  test("refuses to pay an order waiting for the guardian", async () => {
    const { billing, state } = setup();
    const existing = state.orders.get("order-1");
    if (existing) {
      state.orders.set("order-1", { ...existing, awaitingGuardian: true });
    }
    await expect(
      billing.startOrderCheckout({ orderId: "order-1", userId: "user-1" })
    ).rejects.toThrow(OrderNotPayableError);
  });

  test("refuses to pay someone else's order", async () => {
    const { billing } = setup();
    await expect(
      billing.startOrderCheckout({ orderId: "order-1", userId: "user-2" })
    ).rejects.toThrow(OrderNotPayableError);
  });
});
