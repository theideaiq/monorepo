'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import { useMemo } from 'react';
import type { LedgerTransaction } from '@/types/finance';

const columnHelper = createColumnHelper<LedgerTransaction>();

export function LedgerTable({ data }: { data: LedgerTransaction[] }) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('transaction_date', {
        header: 'Date',
        cell: (info) => format(new Date(info.getValue()), 'MMM dd, yyyy'),
      }),
      columnHelper.accessor('description', {
        header: 'Description',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'lines',
        header: 'Details',
        cell: (props) => {
          const lines = props.row.original.lines;
          return (
            <div className="space-y-1 text-sm">
              {lines.map((line, idx) => (
                <div key={idx} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">
                    {line.account?.name}
                  </span>
                  <div className="flex gap-2">
                    {line.debit > 0 && (
                      <span className="text-red-500">Dr {line.debit}</span>
                    )}
                    {line.credit > 0 && (
                      <span className="text-green-500">Cr {line.credit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          );
        },
      }),
    ],
    [],
  );

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
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="p-4 align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center">
                No results.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
