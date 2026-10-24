import { describe, expect, test } from "vitest";
import {
  fromBaghdadInput,
  monthStart,
  monthStartIso,
  toBaghdadInput,
  todayInBaghdad,
} from "./dates";

describe("Baghdad date inputs", () => {
  test("reads datetime-local values as Baghdad time (UTC+3)", () => {
    expect(fromBaghdadInput("2026-11-04T18:30")).toBe(
      "2026-11-04T15:30:00.000Z"
    );
    expect(fromBaghdadInput("2026-01-01T00:00")).toBe(
      "2025-12-31T21:00:00.000Z"
    );
  });

  test("rejects invalid values", () => {
    expect(fromBaghdadInput("")).toBeNull();
    expect(fromBaghdadInput("2026-02-30T10:00")).toBeNull();
    expect(fromBaghdadInput("tomorrow")).toBeNull();
  });

  test("round-trips through the input format", () => {
    expect(toBaghdadInput("2026-11-04T15:30:00.000Z")).toBe("2026-11-04T18:30");
    expect(toBaghdadInput(null)).toBe("");
  });

  test("months and days follow Baghdad, not UTC", () => {
    // 22:00 UTC on 31 October is already 1 November in Baghdad.
    const now = new Date("2026-10-31T22:00:00Z");
    expect(todayInBaghdad(now)).toBe("2026-11-01");
    expect(monthStart(now)).toBe("2026-11-01");
    expect(monthStart(now, -11)).toBe("2025-12-01");
    expect(monthStartIso(now)).toBe("2026-10-31T21:00:00.000Z");
  });
});
