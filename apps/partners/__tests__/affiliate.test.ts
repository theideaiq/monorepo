import { describe, expect, test } from "vitest";
import { affiliateBalance } from "@/lib/affiliate-queries";

describe("affiliateBalance", () => {
  test("splits pending commission by the end of the return window", () => {
    const now = Date.parse("2026-11-01T00:00:00Z");
    expect(
      affiliateBalance(
        [
          {
            amount: 4000,
            available_at: "2026-10-20T00:00:00Z",
            status: "pending",
          },
          {
            amount: -1000,
            available_at: "2026-10-21T00:00:00Z",
            status: "pending",
          },
          {
            amount: 2500,
            available_at: "2026-11-10T00:00:00Z",
            status: "pending",
          },
          {
            amount: 9000,
            available_at: "2026-10-01T00:00:00Z",
            status: "paid",
          },
          { amount: 700, available_at: "2026-10-01T00:00:00Z", status: "void" },
        ],
        now
      )
    ).toEqual({ payable: 3000, waiting: 2500 });
  });
});
