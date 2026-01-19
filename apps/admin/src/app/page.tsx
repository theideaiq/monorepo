import { MetricCard } from '@repo/ui';
import { Package, ShoppingBag, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch counts in parallel to reduce waterfall latency
  const [
    { count: userCount, error: userError },
    { count: productCount, error: productError },
    { count: activeRentalsCount, error: rentalError },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active'),
  ]);

  if (userError || productError || rentalError) redirect('/login');

  const stats = [
    {
      title: 'Total Users',
      value: userCount ?? 0,
      icon: <Users className="h-4 w-4" />,
      description: 'Registered profiles',
    },
    {
      title: 'Total Products',
      value: productCount ?? 0,
      icon: <Package className="h-4 w-4" />,
      description: 'Available items',
    },
    {
      title: 'Active Rentals',
      value: activeRentalsCount ?? 0,
      icon: <ShoppingBag className="h-4 w-4" />,
      description: 'Currently rented out',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <MetricCard
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
          />
        ))}
      </div>
    </div>
  );
}
