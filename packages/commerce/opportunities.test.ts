import { describe, expect, it } from "vitest";
import { datesAtSource, opportunityCost } from "./opportunities";

describe("opportunityCost", () => {
  const cost = (fee: number, funding: string | null) =>
    opportunityCost({ applicant_fee: fee, funding_type: funding });

  it("shows the price whenever there is a fee", () => {
    expect(cost(5000, "unknown")).toBe("price");
    expect(cost(5000, "fully_funded")).toBe("price");
    expect(cost(5000, null)).toBe("price");
  });

  it("never says free when the funding leaves the cost open", () => {
    expect(cost(0, "unknown")).toBe("unstated");
    expect(cost(0, "fee_charging")).toBe("unstated");
    expect(cost(0, "self_funded")).toBe("unstated");
  });

  it("says free otherwise, and with no funding at all", () => {
    expect(cost(0, "free_to_enter")).toBe("free");
    expect(cost(0, "fully_funded")).toBe("free");
    expect(cost(0, null)).toBe("free");
  });
});

describe("datesAtSource", () => {
  const row = { deadline: null, last_checked_on: null, source_url: null };

  it("applies to a listing with a source or check date and no deadline", () => {
    expect(datesAtSource({ ...row, source_url: "https://example.org" })).toBe(
      true
    );
    expect(datesAtSource({ ...row, last_checked_on: "2026-11-04" })).toBe(true);
  });

  it("leaves other listings and those with a deadline alone", () => {
    expect(datesAtSource(row)).toBe(false);
    expect(
      datesAtSource({
        ...row,
        deadline: "2027-01-01T00:00:00Z",
        source_url: "https://example.org",
      })
    ).toBe(false);
  });
});
