'use client';

import { Card } from '@repo/ui';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useState } from 'react';
import type { HRStaffPlan } from '@/types/finance';

const columnHelper = createColumnHelper<HRStaffPlan>();

export function StaffTable({ data }: { data: HRStaffPlan[] }) {
  const columns = [
    columnHelper.accessor('role_title', { header: 'Role' }),
    columnHelper.accessor('department', { header: 'Department' }),
    columnHelper.accessor('monthly_salary', {
      header: 'Monthly Salary',
      cell: (info) =>
        new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(info.getValue()),
    }),
    columnHelper.accessor('annual_increase_pct', {
      header: 'Annual Increase',
      cell: (info) => `${info.getValue()}%`,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: (info) => <span className="capitalize">{info.getValue()}</span>,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 border-b">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="border-b transition-colors hover:bg-muted/50"
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="p-4 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StaffProjection({ data }: { data: HRStaffPlan[] }) {
  const [simulate, setSimulate] = useState(false);

  const currentAnnual = data.reduce(
    (sum, staff) => sum + staff.monthly_salary * 12,
    0,
  );
  const projectedAnnual = data.reduce((sum, staff) => {
    return (
      sum + staff.monthly_salary * 12 * (1 + staff.annual_increase_pct / 100)
    );
  }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="simulate"
          checked={simulate}
          onChange={(e) => setSimulate(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label
          htmlFor="simulate"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          Simulate 12-Month Projection
        </label>
      </div>

      {simulate && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-6 bg-muted/20">
            <h4 className="text-sm font-medium text-muted-foreground">
              Current Annual Payroll
            </h4>
            <p className="text-2xl font-bold mt-2">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(currentAnnual)}
            </p>
          </Card>
          <Card className="p-6 bg-brand-pink/10 border-brand-pink/20">
            <h4 className="text-sm font-medium text-brand-pink">
              Projected (w/ Increases)
            </h4>
            <p className="text-2xl font-bold mt-2 text-brand-pink">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(projectedAnnual)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              (+
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(projectedAnnual - currentAnnual)}
              )
            </p>
          </Card>
        </div>
      )}
    </div>
  );
}
