'use client';

import type { ColumnDef } from '@tanstack/react-table';

// Define the shape of our Product data.
export type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  type: string;
  stock_count: number;
  rental_tier: string | null;
  created_at: string;
};

export const columns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
  {
    accessorKey: 'category',
    header: 'Category',
  },
  {
    accessorKey: 'type',
    header: 'Type',
  },
  {
    accessorKey: 'price',
    header: 'Price',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('price'));
      // Format as currency (IQD usually doesn't use decimals much, but staying safe)
      const formatted = new Intl.NumberFormat('en-IQ', {
        style: 'currency',
        currency: 'IQD',
        minimumFractionDigits: 0,
      }).format(amount);

      return <div className="font-medium">{formatted}</div>;
    },
  },
  {
    accessorKey: 'stock_count',
    header: 'Stock',
  },
  {
    accessorKey: 'rental_tier',
    header: 'Rental Tier',
    cell: ({ row }) => {
      const tier = row.getValue('rental_tier') as string;
      return tier ? (
        <span className="capitalize">{tier}</span>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
  },
];
