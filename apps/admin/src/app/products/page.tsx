import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { columns, type Product } from './columns';
import { DataTable } from './data-table';

async function getProducts(): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('products')
    // Select only necessary fields to reduce payload size and improve query performance
    .select(
      'id, name, price, category, type, stock_count, rental_tier, created_at',
    )
    .order('created_at', { ascending: false });

  if (error) {
    // biome-ignore lint/suspicious/noConsole: Log error for debugging
    console.error('Error fetching products:', error);
    redirect('/login');
  }

  return (data as Product[]) || [];
}

export default async function ProductsPage() {
  const data = await getProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
