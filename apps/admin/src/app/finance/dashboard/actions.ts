import { createClient } from '@/lib/supabase/server';

export async function getCashFlowData(year: number) {
  const supabase = await createClient();
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: lines, error } = await supabase
    .from('ledger_lines')
    .select(`
            debit,
            credit,
            chart_of_accounts!inner (
                type
            ),
            ledger_entries!inner (
                transaction_date
            )
        `)
    .gte('ledger_entries.transaction_date', startDate)
    .lte('ledger_entries.transaction_date', endDate);

  if (error) {
    return [];
  }

  // Group by month
  const monthlyData: Record<string, { revenue: number; expenses: number }> = {};
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  // biome-ignore lint/suspicious/noExplicitAny: DB join result
  lines.forEach((line: any) => {
    const date = new Date(line.ledger_entries.transaction_date);
    const monthIndex = date.getMonth();
    const month = monthNames[monthIndex];

    if (month && !monthlyData[month]) {
      monthlyData[month] = { revenue: 0, expenses: 0 };
    }

    if (!month) return;

    const debit = Number(line.debit) || 0;
    const credit = Number(line.credit) || 0;
    const type = line.chart_of_accounts.type;

    if (type === 'revenue') {
      monthlyData[month].revenue += credit - debit;
    } else if (type === 'expense') {
      monthlyData[month].expenses += debit - credit;
    }
  });

  return monthNames.map((month) => ({
    month,
    revenue: monthlyData[month]?.revenue || 0,
    expenses: monthlyData[month]?.expenses || 0,
  }));
}
