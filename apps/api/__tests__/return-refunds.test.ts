import type { PaymentProvider } from "@repo/payments";
import { describe, expect, it, vi } from "vitest";
import {
  type DueRefund,
  refundReason,
  refundReturns,
} from "@/lib/return-refunds";

const due = (overrides: Partial<DueRefund> = {}): DueRefund => ({
  amount: 20_000,
  item_name: "Blonde",
  number: 1001,
  order_number: "10042",
  payment_reference: "ref-1",
  reason: "faulty",
  refundable: 25_000,
  return_id: "r1",
  ...overrides,
});

const setup = (
  rows: DueRefund[],
  refund: PaymentProvider["refund"] = () =>
    Promise.resolve({
      amount: { amount: 20_000, currency: "IQD" },
      id: "w1",
      raw: {},
      referenceId: "ref-1",
      status: "refunded",
    })
) => {
  const rpc = vi.fn((name: string) =>
    Promise.resolve(
      name === "claim_return_refunds"
        ? { data: rows, error: null }
        : { data: null, error: null }
    )
  );
  const provider = { refund: vi.fn(refund) } as unknown as PaymentProvider;
  return { admin: { rpc } as never, provider, rpc };
};

describe("refundReason", () => {
  it("meets Wayl's 100-character minimum and names the return", () => {
    const reason = refundReason(due());
    expect(reason.length).toBeGreaterThanOrEqual(100);
    expect(reason.length).toBeLessThanOrEqual(1500);
    expect(reason).toContain("R-1001");
    expect(reason).toContain("#10042");
    expect(reason).toContain("faulty");
  });
});

describe("refundReturns", () => {
  it("refunds through Wayl and records it", async () => {
    const { admin, provider, rpc } = setup([due()]);
    await expect(refundReturns(admin, provider)).resolves.toEqual({
      failed: 0,
      refunded: 1,
      skipped: 0,
    });
    expect(provider.refund).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: { amount: 20_000, currency: "IQD" },
        referenceId: "ref-1",
      })
    );
    expect(rpc).toHaveBeenCalledWith("record_return_refund", {
      reference: "w1",
      target: "r1",
    });
  });

  it("leaves refunds Wayl can't take for finance", async () => {
    const { admin, provider, rpc } = setup([
      due({ amount: 500, return_id: "small" }),
      due({ amount: 30_000, return_id: "over" }),
    ]);
    await expect(refundReturns(admin, provider)).resolves.toEqual({
      failed: 0,
      refunded: 0,
      skipped: 2,
    });
    expect(provider.refund).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith("release_return_refund", {
      target: "small",
    });
    expect(rpc).toHaveBeenCalledWith("release_return_refund", {
      target: "over",
    });
  });

  it("releases a refund Wayl refuses, to try again", async () => {
    const { admin, provider, rpc } = setup([due()], () =>
      Promise.reject(new Error("Wayl is down"))
    );
    await expect(refundReturns(admin, provider)).resolves.toEqual({
      failed: 1,
      refunded: 0,
      skipped: 0,
    });
    expect(rpc).toHaveBeenCalledWith("release_return_refund", {
      target: "r1",
    });
    expect(rpc).not.toHaveBeenCalledWith(
      "record_return_refund",
      expect.anything()
    );
  });

  it("throws when the claim fails", async () => {
    const rpc = vi.fn(() =>
      Promise.resolve({ data: null, error: { message: "boom" } })
    );
    await expect(
      refundReturns({ rpc } as never, {} as PaymentProvider)
    ).rejects.toThrow("claim_return_refunds: boom");
  });
});
