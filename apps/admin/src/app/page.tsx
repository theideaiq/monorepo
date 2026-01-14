import { Card } from '@repo/ui';
import { Package, ShoppingBag, Users } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch counts
  const { count: userCount, error: userError } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  if (userError) redirect('/login');

  const { count: productCount, error: productError } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  if (productError) redirect('/login');

  const { count: activeRentalsCount, error: rentalError } = await supabase
    .from('rentals')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active');
  if (rentalError) redirect('/login');

  const stats = [
    {
      title: 'Total Users',
      value: userCount ?? 0,
      icon: Users,
      description: 'Registered profiles',
    },
    {
      title: 'Total Products',
      value: productCount ?? 0,
      icon: Package,
      description: 'Available items',
    },
    {
      title: 'Active Rentals',
      value: activeRentalsCount ?? 0,
      icon: ShoppingBag,
      description: 'Currently rented out',
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="p-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </span>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-bold">{stat.value}</div>
              <span className="text-xs text-muted-foreground">
                {stat.description}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
