import type { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import type { PaymentProvider } from "@repo/payments";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Wayl refuses refunds under 1,000 IQD; finance sends those by hand. */
const MIN_REFUND = 1000;

const REASONS: Record<string, string> = {
  changed_mind: "the customer changed their mind about an unopened item",
  faulty: "the item was faulty",
  never_arrived: "the item never arrived",
  not_as_described: "the item was not as described",
  wrong_item: "the wrong item was sent",
};

export interface DueRefund {
  amount: number;
  item_name: string;
  number: number;
  order_number: string;
  payment_reference: string;
  reason: string;
  refundable: number;
  return_id: string;
}

/**
 * Wayl wants a reason of 100 to 1,500 characters: the order, the item,
 * the return and why it came back.
 */
export const refundReason = (refund: DueRefund) =>
  `Refund for return R-${refund.number} on The IDEA order #${refund.order_number}: ${refund.item_name.slice(0, 200)} was returned because ${REASONS[refund.reason] ?? "of a return accepted by The IDEA"}. The item was checked after it came back, so its share of the payment is refunded.`;

export interface RefundRun {
  failed: number;
  refunded: number;
  skipped: number;
}

type Outcome = keyof RefundRun;

/** One claimed refund: sent and recorded, left for finance, or retried. */
const sendRefund = async (
  admin: AdminClient,
  provider: PaymentProvider,
  refund: DueRefund
): Promise<Outcome> => {
  const release = async () => {
    await admin.rpc("release_return_refund", { target: refund.return_id });
  };
  if (refund.amount < MIN_REFUND || refund.amount > refund.refundable) {
    await release();
    return "skipped";
  }
  try {
    const result = await provider.refund({
      amount: { amount: refund.amount, currency: "IQD" },
      reason: refundReason(refund),
      referenceId: refund.payment_reference,
    });
    if (result.status === "rejected" || result.status === "canceled") {
      throw new Error(`Wayl ${result.status} the refund`);
    }
    const recorded = await admin.rpc("record_return_refund", {
      reference: result.id,
      target: refund.return_id,
    });
    if (recorded.error) {
      // Wayl has the refund: never release it, or it would go twice.
      log.error(
        `Return R-${refund.number} refunded in Wayl (${result.id}) but not recorded: ${recorded.error.message}`
      );
    }
    return "refunded";
  } catch (error) {
    log.error(
      `Refund for return R-${refund.number} failed: ${error instanceof Error ? error.message : String(error)}`
    );
    await release();
    return "failed";
  }
};

/**
 * Sends the due refunds of returns paid online through Wayl
 * (`claim_return_refunds`, which returns nothing while
 * `store_settings.wayl_return_refunds` is off) and records each one.
 * A refund Wayl refuses, or one it can't take (under its minimum, or more
 * than is left on the payment), is released for finance to send by hand.
 */
export const refundReturns = async (
  admin: AdminClient,
  provider: PaymentProvider
): Promise<RefundRun> => {
  const claimed = await admin.rpc("claim_return_refunds", { max_rows: 20 });
  if (claimed.error) {
    throw new Error(`claim_return_refunds: ${claimed.error.message}`);
  }
  const outcomes = await Promise.all(
    ((claimed.data ?? []) as DueRefund[]).map((refund) =>
      sendRefund(admin, provider, refund)
    )
  );
  const run: RefundRun = { failed: 0, refunded: 0, skipped: 0 };
  for (const outcome of outcomes) {
    run[outcome] += 1;
  }
  return run;
};
