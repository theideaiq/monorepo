'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { EquityHolder } from '@/types/finance';

export function EquityPieChart({ holders }: { holders: EquityHolder[] }) {
  // Group by name (or type if preferred, but prompt said "Pie Chart of ownership").
  // Usually means by holder name.

  // Grouping by holder name just in case multiple entries exist for same person (e.g. different rounds)
  const dataMap: Record<string, number> = {};
  holders.forEach((h) => {
    dataMap[h.name] = (dataMap[h.name] || 0) + Number(h.shares_owned);
  });

  const data = Object.entries(dataMap).map(([name, value]) => ({
    name,
    value,
  }));
  const COLORS = [
    '#0088FE',
    '#00C49F',
    '#FFBB28',
    '#FF8042',
    '#8884d8',
    '#82ca9d',
  ];

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            // FIX: Added nullish coalescing (?? 0) to handle undefined percent
            label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_entry, index) => (
              <Cell
                // biome-ignore lint/suspicious/noArrayIndexKey: Static chart data
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EquityTable({ holders }: { holders: EquityHolder[] }) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          <tr>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Name
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Type
            </th>
            <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
              Shares
            </th>
            <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
              Vesting Start
            </th>
          </tr>
        </thead>
        <tbody>
          {holders.map((holder) => (
            <tr
              key={holder.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              <td className="p-4 align-middle font-medium">{holder.name}</td>
              <td className="p-4 align-middle capitalize">{holder.type}</td>
              <td className="p-4 align-middle text-right">
                {new Intl.NumberFormat('en-US').format(holder.shares_owned)}
              </td>
              <td className="p-4 align-middle">
                {new Date(holder.vesting_start_date).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
