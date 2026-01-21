'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui';
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
    <div className="rounded-md border border-slate-200 overflow-hidden shadow-sm">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="hover:bg-slate-50">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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
          className="h-4 w-4 rounded border-slate-300 text-brand-pink focus:ring-brand-pink"
        />
        <label
          htmlFor="simulate"
          className="text-sm font-medium leading-none text-slate-700"
        >
          Simulate 12-Month Projection
        </label>
      </div>

      {simulate && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-slate-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                Current Annual Payroll
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(currentAnnual)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-brand-pink/5 border-brand-pink/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-brand-pink">
                Projected (w/ Increases)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-brand-pink">
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(projectedAnnual)}
              </div>
              <p className="text-xs text-brand-pink/80 mt-1">
                (+
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(projectedAnnual - currentAnnual)}
                )
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
