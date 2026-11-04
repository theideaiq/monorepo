import { describe, expect, it } from "vitest";
import { datesAtSource, opportunityCost } from "./opportunities";

describe("opportunityCost", () => {
  const entered = { last_checked_on: null, source_url: null };
  const catalog = {
    last_checked_on: "2026-11-04",
    source_url: "https://example.org",
  };
  const cost = (
    fee: number,
    funding: string | null,
    origin: typeof entered | typeof catalog = entered
  ) =>
    opportunityCost({ applicant_fee: fee, funding_type: funding, ...origin });

  it("shows the price whenever there is a fee", () => {
    expect(cost(5000, "unknown", catalog)).toBe("price");
    expect(cost(5000, "fully_funded")).toBe("price");
    expect(cost(5000, null)).toBe("price");
  });

  it("never says free for funding that points to a cost", () => {
    expect(cost(0, "fee_charging")).toBe("unstated");
    expect(cost(0, "self_funded")).toBe("unstated");
    expect(cost(0, "fee_charging", catalog)).toBe("unstated");
    expect(cost(0, "self_funded", catalog)).toBe("unstated");
  });

  it("keeps free on a listing whose organization entered the fee", () => {
    expect(cost(0, "unknown")).toBe("free");
    expect(cost(0, null)).toBe("free");
  });

  it("says nothing for unknown funding on a catalogued listing", () => {
    expect(cost(0, "unknown", catalog)).toBe("unstated");
    expect(
      opportunityCost({
        applicant_fee: 0,
        funding_type: "unknown",
        last_checked_on: "2026-11-04",
        source_url: null,
      })
    ).toBe("unstated");
    expect(
      opportunityCost({
        applicant_fee: 0,
        funding_type: "unknown",
        last_checked_on: null,
        source_url: "https://example.org",
      })
    ).toBe("unstated");
  });

  it("says free for funding that doesn't point to a cost", () => {
    expect(cost(0, "free_to_enter", catalog)).toBe("free");
    expect(cost(0, "fully_funded", catalog)).toBe("free");
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
