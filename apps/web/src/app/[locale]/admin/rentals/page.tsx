'use client';

import { createClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

const supabase = createClient(
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  // biome-ignore lint/style/noNonNullAssertion: migration
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function RentalsManager() {
  // biome-ignore lint/suspicious/noExplicitAny: migration
  const [rentals, setRentals] = useState<any[]>([]);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from('rentals')
      .select('*')
      .order('created_at', { ascending: false });
    setRentals(data || []);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (id: number, status: string) => {
    await supabase.from('rentals').update({ status }).eq('id', id);
    toast.success('Status Updated');
    fetchOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-brand-dark">
          Rental Management
        </h1>
        <Button variant="outline" onClick={fetchOrders}>
          Refresh Data
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-slate-600">ID</th>
              <th className="p-4 text-slate-600">Item</th>
              <th className="p-4 text-slate-600">Status</th>
              <th className="p-4 text-slate-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rentals.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="p-4 text-slate-500">#{r.id}</td>
                <td className="p-4 font-bold">{r.item_name}</td>
                <td className="p-4">
                  <Badge
                    variant={r.status === 'active' ? 'warning' : 'success'}
                  >
                    {r.status}
                  </Badge>
                </td>
                <td className="p-4 text-right gap-2 flex justify-end">
                  {r.status === 'active' && (
                    <Button
                      onClick={() => updateStatus(r.id, 'delivered')}
                      variant="dark"
                      className="h-8 px-2 text-xs"
                    >
                      Deliver
                    </Button>
                  )}
                  {r.status === 'delivered' && (
                    <Button
                      onClick={() => updateStatus(r.id, 'returned')}
                      variant="outline"
                      className="h-8 px-2 text-xs"
                    >
                      Return
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
