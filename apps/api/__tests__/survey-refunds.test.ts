import type { PaymentProvider } from "@repo/payments";
import { describe, expect, it, vi } from "vitest";
import {
  type DueSurveyRefund,
  surveyRefundReason,
  sweepSurveys,
} from "@/lib/survey-refunds";

const due = (overrides: Partial<DueSurveyRefund> = {}): DueSurveyRefund => ({
  amount: 8800,
  order_number: "10077",
  payment_id: "p1",
  payment_reference: "ref-1",
  refundable: 8800,
  survey_id: "s1",
  title: "Study habits",
  ...overrides,
});

const setup = (
  rows: DueSurveyRefund[],
  refund: PaymentProvider["refund"] = () =>
    Promise.resolve({
      amount: { amount: 8800, currency: "IQD" },
      id: "w1",
      raw: {},
      referenceId: "ref-1",
      status: "refunded",
    })
) => {
  const rpc = vi.fn((name: string) =>
    Promise.resolve(
      {
        claim_survey_refunds: { data: rows, error: null },
        sweep_surveys: { data: 2, error: null },
      }[name] ?? { data: null, error: null }
    )
  );
  const provider = { refund: vi.fn(refund) } as unknown as PaymentProvider;
  return { admin: { rpc } as never, provider, rpc };
};

describe("surveyRefundReason", () => {
  it("meets Wayl's 100-character minimum and names the survey", () => {
    const reason = surveyRefundReason(due());
    expect(reason.length).toBeGreaterThanOrEqual(100);
    expect(reason.length).toBeLessThanOrEqual(1500);
    expect(reason).toContain("Study habits");
    expect(reason).toContain("#10077");
  });
});

describe("sweepSurveys", () => {
  it("closes surveys past their end, refunds through Wayl and records it", async () => {
    const { admin, provider, rpc } = setup([due()]);
    await expect(sweepSurveys(admin, provider)).resolves.toEqual({
      closed: 2,
      failed: 0,
      refunded: 1,
      skipped: 0,
    });
    expect(rpc).toHaveBeenCalledWith("record_survey_refund", {
      amount: 8800,
      payment: "p1",
      reference: "w1",
      target: "s1",
    });
  });

  it("leaves refunds Wayl can't take for finance", async () => {
    const { admin, provider, rpc } = setup([due({ amount: 880 })]);
    await expect(sweepSurveys(admin, provider)).resolves.toMatchObject({
      skipped: 1,
    });
    expect(provider.refund).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("release_survey_refund", { target: "s1" });
  });

  it("releases a refund Wayl refuses", async () => {
    const { admin, provider, rpc } = setup([due()], () =>
      Promise.reject(new Error("down"))
    );
    await expect(sweepSurveys(admin, provider)).resolves.toMatchObject({
      failed: 1,
    });
    expect(rpc).toHaveBeenCalledWith("release_survey_refund", { target: "s1" });
  });
});
