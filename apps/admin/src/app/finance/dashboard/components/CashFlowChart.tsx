'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface ChartData {
  month: string;
  revenue: number;
  expenses: number;
}

export function CashFlowChart({ data }: { data: ChartData[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            formatter={(value: number | undefined) =>
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value ?? 0)
            }
          />
          <Legend />
          <Bar dataKey="revenue" fill="#10b981" name="Revenue" />
          <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
