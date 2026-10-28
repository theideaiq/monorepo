import { describe, expect, it, vi } from "vitest";
import { sweepSelling } from "@/lib/selling-sweep";

const adminWith = (
  results: Record<string, { data: unknown; error: unknown }>
) => {
  const rpc = vi.fn((name: string) => Promise.resolve(results[name]));
  return { admin: { rpc } as never, rpc };
};

describe("sweepSelling", () => {
  it("runs the five sweeps and counts what changed", async () => {
    const { admin, rpc } = adminWith({
      refresh_seller_scores: { data: 4, error: null },
      refresh_was_prices: { data: 3, error: null },
      sweep_listing_sales: { data: 2, error: null },
      sweep_offers: { data: [{ id: "o1" }], error: null },
      sweep_returns: { data: [{ id: "r1" }, { id: "r2" }], error: null },
    });
    await expect(sweepSelling(admin)).resolves.toEqual({
      offers: 1,
      returns: 2,
      sales: 2,
      scores: 4,
      wasPrices: 3,
    });
    expect(rpc.mock.calls.map(([name]) => name)).toEqual([
      "sweep_returns",
      "sweep_offers",
      "refresh_seller_scores",
      "sweep_listing_sales",
      "refresh_was_prices",
    ]);
  });

  it("stops at the first failure", async () => {
    const { admin, rpc } = adminWith({
      sweep_returns: { data: null, error: { message: "boom" } },
    });
    await expect(sweepSelling(admin)).rejects.toThrow("sweep_returns: boom");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
