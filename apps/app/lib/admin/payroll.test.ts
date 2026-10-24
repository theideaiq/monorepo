import { describe, expect, test } from "vitest";
import { ownership, projectPayroll } from "./payroll";

describe("payroll projection", () => {
  test("counts positions from their start month with yearly raises", () => {
    const result = projectPayroll(
      [
        {
          annual_increase_pct: 10,
          id: "a",
          monthly_salary: 1_000_000,
          start_date: "2025-12-15",
          status: "active",
        },
        {
          annual_increase_pct: 0,
          id: "b",
          monthly_salary: 500_000,
          start_date: "2026-03-01",
          status: "hiring",
        },
        {
          annual_increase_pct: 0,
          id: "c",
          monthly_salary: 900_000,
          start_date: null,
          status: "terminated",
        },
      ],
      "2026-01-01",
      12
    );

    expect(result).toHaveLength(12);
    expect(result[0]).toEqual({
      headcount: 1,
      month: "2026-01-01",
      total: 1_000_000,
    });
    expect(result[2]).toEqual({
      headcount: 2,
      month: "2026-03-01",
      total: 1_500_000,
    });
    // December 2026: a full year after the first start → 10% raise.
    expect(result[11]).toEqual({
      headcount: 2,
      month: "2026-12-01",
      total: 1_600_000,
    });
  });

  test("positions without a start date count right away", () => {
    const [first] = projectPayroll(
      [
        {
          annual_increase_pct: 5,
          id: "a",
          monthly_salary: 750_000,
          start_date: null,
          status: "planned",
        },
      ],
      "2026-11-01",
      1
    );
    expect(first).toEqual({
      headcount: 1,
      month: "2026-11-01",
      total: 750_000,
    });
  });
});

describe("ownership", () => {
  test("percent of all shares", () => {
    const { holders, total } = ownership([
      { name: "A", shares: 750 },
      { name: "B", shares: 250 },
    ]);
    expect(total).toBe(1000);
    expect(holders.map((holder) => holder.percent)).toEqual([75, 25]);
    expect(ownership([]).total).toBe(0);
  });
});
