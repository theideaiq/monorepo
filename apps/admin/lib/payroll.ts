/** A row of the staff plan (payroll), as stored in `staff_plan`. */
export interface PlannedPosition {
  annual_increase_pct: number;
  id: string;
  monthly_salary: number;
  start_date: string | null;
  status: "planned" | "hiring" | "active" | "terminated";
}

export interface PayrollMonth {
  /** First day of the month, YYYY-MM-01. */
  month: string;
  headcount: number;
  total: number;
}

const parseMonth = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return { month: (month ?? 1) - 1, year: year ?? 1970 };
};

const monthKey = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

/**
 * Projected monthly payroll for `months` months from `fromMonth`. A position
 * counts from the month it starts (immediately when it has no start date),
 * terminated positions are left out, and salaries grow by the position's
 * annual increase on each anniversary of its start.
 */
export const projectPayroll = (
  positions: PlannedPosition[],
  fromMonth: string,
  months = 12
): PayrollMonth[] => {
  const start = parseMonth(fromMonth);

  return Array.from({ length: months }, (_, index) => {
    const year = start.year + Math.floor((start.month + index) / 12);
    const month = (start.month + index) % 12;
    let total = 0;
    let headcount = 0;

    for (const position of positions) {
      if (position.status === "terminated") {
        continue;
      }
      let yearsInRole = 0;
      if (position.start_date) {
        const began = parseMonth(position.start_date);
        const elapsed = (year - began.year) * 12 + (month - began.month);
        if (elapsed < 0) {
          continue;
        }
        yearsInRole = Math.floor(elapsed / 12);
      }
      headcount += 1;
      total += Math.round(
        position.monthly_salary *
          (1 + position.annual_increase_pct / 100) ** yearsInRole
      );
    }

    return { headcount, month: monthKey(year, month), total };
  });
};

/** Each holder's share of the company, in percent of all shares. */
export const ownership = <Holder extends { shares: number }>(
  holders: Holder[]
) => {
  const total = holders.reduce((sum, holder) => sum + holder.shares, 0);
  return {
    holders: holders.map((holder) => ({
      ...holder,
      percent: total > 0 ? (holder.shares / total) * 100 : 0,
    })),
    total,
  };
};
