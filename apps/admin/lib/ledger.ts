export interface MonthlySummaryRow {
  cogs: number;
  expenses: number;
  /** First day of the month, YYYY-MM-DD. */
  month: string;
  revenue: number;
}

export interface MonthTotals extends MonthlySummaryRow {
  /** Gross profit: revenue minus cost of goods sold. */
  gross: number;
  /** Net income: revenue minus all expenses (COGS is one of them). */
  net: number;
}

const monthKey = (year: number, month: number) => {
  const date = new Date(Date.UTC(year, month, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
};

/**
 * `ledger_monthly_summary` rows for `months` months starting at `fromMonth`,
 * with empty months filled in and gross/net computed.
 */
export const monthlyTotals = (
  rows: MonthlySummaryRow[],
  fromMonth: string,
  months: number
): MonthTotals[] => {
  const byMonth = new Map(rows.map((row) => [row.month.slice(0, 7), row]));
  const [year, month] = fromMonth.split("-").map(Number) as [number, number];

  return Array.from({ length: months }, (_, index) => {
    const key = monthKey(year, month - 1 + index);
    const row = byMonth.get(key.slice(0, 7));
    const revenue = Number(row?.revenue ?? 0);
    const expenses = Number(row?.expenses ?? 0);
    const cogs = Number(row?.cogs ?? 0);
    return {
      cogs,
      expenses,
      gross: revenue - cogs,
      month: key,
      net: revenue - expenses,
      revenue,
    };
  });
};

/** Sums of several months (e.g. year to date). */
export const sumTotals = (months: MonthTotals[]) =>
  months.reduce(
    (total, month) => ({
      cogs: total.cogs + month.cogs,
      expenses: total.expenses + month.expenses,
      gross: total.gross + month.gross,
      net: total.net + month.net,
      revenue: total.revenue + month.revenue,
    }),
    { cogs: 0, expenses: 0, gross: 0, net: 0, revenue: 0 }
  );
