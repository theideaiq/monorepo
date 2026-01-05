'use client';

import React from 'react';
import { TrendingUp, Users, ShoppingCart, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-brand-dark">Mission Control</h1>
        <p className="text-slate-500">Live overview of platform performance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Revenue" value="2.4M IQD" icon={<TrendingUp className="text-green-500" />} />
        <StatsCard title="Active Rentals" value="12" icon={<ShoppingCart className="text-brand-yellow" />} />
        <StatsCard title="Registered Users" value="1,240" icon={<Users className="text-blue-500" />} />
        <StatsCard title="Low Stock Alerts" value="3 Items" icon={<AlertCircle className="text-red-500" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6 h-64 flex items-center justify-center border-dashed border-2">
          <p className="text-slate-400">Sales Chart Coming Soon...</p>
        </Card>
        <Card className="p-6 h-64 flex items-center justify-center border-dashed border-2">
           <p className="text-slate-400">Recent Activity Log Coming Soon...</p>
        </Card>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function StatsCard({ title, value, icon }: any) {
  return (
    <Card className="p-6 flex items-center gap-4">
      <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-brand-dark">{value}</h3>
      </div>
    </Card>
  );
}
