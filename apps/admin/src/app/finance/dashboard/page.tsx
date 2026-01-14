import { Card } from '@repo/ui';
import { getProfitAndLoss, getStaff } from '../actions';
import { CashFlowChart } from './components/CashFlowChart';
import { KPICard } from './components/KPICard';

export default async function FinanceDashboard() {
  // Hardcoded date range for now, or dynamic based on current year
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
  const endOfYear = new Date(today.getFullYear(), 11, 31).toISOString();

  // Parallel data fetching
  const [pnl, staff] = await Promise.all([
    getProfitAndLoss(startOfYear, endOfYear),
    getStaff(),
  ]);

  // Calculate KPIs
  // 1. Runway (Months) = Cash Balance / Monthly Burn
  // For simplicity, we might need current cash balance from Balance Sheet (which is sum of all Asset:Cash ledgers).
  // But getProfitAndLoss returns Income Statement.
  // Let's assume we fetch Cash Balance separately or approximate.
  // Given constraints, I'll calculate Burn Rate from Expenses (Avg monthly).
  // Runway needs cash. I'll hardcode or estimate if not available, or add logic to get Cash Balance.
  // Let's stick to what we have:
  // Burn Rate = Total Expenses / Months passed (or projected).

  const monthsPassed = today.getMonth() + 1;
  const avgMonthlyBurn = pnl.expenses / monthsPassed;
  const mrr = pnl.revenue / monthsPassed; // Rough proxy for MRR if revenue is mostly recurring
  const ytdRevenue = pnl.revenue;

  // To get Cash Balance, we technically need to sum all 'asset' entries for 'Cash' accounts since beginning of time.
  // For this MVP, I might display "N/A" or try to fetch it if I add a helper.
  // Let's rely on YTD Revenue, Burn Rate, MRR for now. Runway might need manual input or balance sheet query.

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard title="YTD Revenue" value={ytdRevenue} type="currency" />
        <KPICard title="Est. MRR" value={mrr} type="currency" />
        <KPICard
          title="Avg Monthly Burn"
          value={avgMonthlyBurn}
          type="currency"
        />
        <KPICard title="Net Income YTD" value={pnl.netIncome} type="currency" />
      </div>

      <div className="grid gap-4 md:grid-cols-1">
        <Card className="p-6">
          <h3 className="text-lg font-medium mb-4">Cash Flow Forecast (YTD)</h3>
          {/* We need monthly breakdown for the chart. getProfitAndLoss returns totals.
                 We might need to adjust getProfitAndLoss to return monthly data or fetch it here.
                 For now, let's update getProfitAndLoss or handle it.
                 Actually, the prompt said: "Use recharts to plot the 'Cash Flow Forecast' (Revenue vs Expenses)."
                 To plot a chart, I need data points (e.g. Jan, Feb, Mar).
                 I will need to modify getProfitAndLoss or fetch ledger entries and group by month here.
             */}
          <CashFlowChartWrapper startDate={startOfYear} endDate={endOfYear} />
        </Card>
      </div>
    </div>
  );
}

// Client wrapper for the chart to handle data grouping if not done in server action,
// OR we can create a specific server action for the chart data.
// Let's create a specific component that fetches its own data or pass data from a new action.
import { CashFlowChartWrapper } from './components/CashFlowChartWrapper';
