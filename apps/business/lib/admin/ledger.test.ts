import { expect, test } from "vitest";
import { monthlyTotals, sumTotals } from "./ledger";

test("fills empty months and computes gross and net", () => {
  const months = monthlyTotals(
    [
      { cogs: 300, expenses: 500, month: "2026-01-01", revenue: 1000 },
      { cogs: 0, expenses: 200, month: "2026-03-01", revenue: 0 },
    ],
    "2025-12-01",
    4
  );

  expect(months.map((month) => month.month)).toEqual([
    "2025-12-01",
    "2026-01-01",
    "2026-02-01",
    "2026-03-01",
  ]);
  expect(months[1]).toEqual({
    cogs: 300,
    expenses: 500,
    gross: 700,
    month: "2026-01-01",
    net: 500,
    revenue: 1000,
  });
  expect(months[2]?.net).toBe(0);
  expect(months[3]?.net).toBe(-200);
  expect(sumTotals(months)).toEqual({
    cogs: 300,
    expenses: 700,
    gross: 700,
    net: 300,
    revenue: 1000,
  });
});
