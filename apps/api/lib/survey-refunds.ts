import type { createAdminClient } from "@repo/database/admin";
import { log } from "@repo/observability/log";
import type { PaymentProvider } from "@repo/payments";
import type { RefundRun } from "./return-refunds";

type AdminClient = ReturnType<typeof createAdminClient>;

/** Wayl refuses refunds under 1,000 IQD; finance sends those by hand. */
const MIN_REFUND = 1000;

export interface DueSurveyRefund {
  amount: number;
  order_number: string;
  payment_id: string;
  payment_reference: string;
  refundable: number;
  survey_id: string;
  title: string;
}

/**
 * Wayl wants a reason of 100 to 1,500 characters: the survey, its order
 * and why money goes back.
 */
export const surveyRefundReason = (refund: DueSurveyRefund) =>
  `Refund for the Boosted survey "${refund.title.slice(0, 160)}" paid with The IDEA order #${refund.order_number}: the survey has closed, and the rewards it did not use are refunded to the creator.`;

type Outcome = keyof RefundRun;

/** One claimed refund: sent and recorded, left for finance, or retried. */
const sendRefund = async (
  admin: AdminClient,
  provider: PaymentProvider,
  refund: DueSurveyRefund
): Promise<Outcome> => {
  const release = async () => {
    await admin.rpc("release_survey_refund", { target: refund.survey_id });
  };
  if (refund.amount < MIN_REFUND || refund.amount > refund.refundable) {
    await release();
    return "skipped";
  }
  try {
    const result = await provider.refund({
      amount: { amount: refund.amount, currency: "IQD" },
      reason: surveyRefundReason(refund),
      referenceId: refund.payment_reference,
    });
    if (result.status === "rejected" || result.status === "canceled") {
      throw new Error(`Wayl ${result.status} the refund`);
    }
    const recorded = await admin.rpc("record_survey_refund", {
      amount: refund.amount,
      payment: refund.payment_id,
      reference: result.id,
      target: refund.survey_id,
    });
    if (recorded.error) {
      // Wayl has the refund: never release it, or it would go twice.
      log.error(
        `Survey ${refund.survey_id} refunded in Wayl (${result.id}) but not recorded: ${recorded.error.message}`
      );
    }
    return "refunded";
  } catch (error) {
    log.error(
      `Refund for survey ${refund.survey_id} failed: ${error instanceof Error ? error.message : String(error)}`
    );
    await release();
    return "failed";
  }
};

/**
 * Closes surveys past their 60 days (`sweep_surveys`), then sends what
 * closed Boosted surveys didn't use back through Wayl
 * (`claim_survey_refunds`), from the payment with the most left, and
 * records each one. One Wayl refuses or can't take is released for
 * finance.
 */
export const sweepSurveys = async (
  admin: AdminClient,
  provider: PaymentProvider
): Promise<RefundRun & { closed: number }> => {
  const swept = await admin.rpc("sweep_surveys");
  if (swept.error) {
    throw new Error(`sweep_surveys: ${swept.error.message}`);
  }
  const claimed = await admin.rpc("claim_survey_refunds", { max_rows: 20 });
  if (claimed.error) {
    throw new Error(`claim_survey_refunds: ${claimed.error.message}`);
  }
  const outcomes = await Promise.all(
    ((claimed.data ?? []) as DueSurveyRefund[]).map((refund) =>
      sendRefund(admin, provider, refund)
    )
  );
  const run = { closed: swept.data ?? 0, failed: 0, refunded: 0, skipped: 0 };
  for (const outcome of outcomes) {
    run[outcome] += 1;
  }
  return run;
};
