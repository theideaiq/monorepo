'use client';

import { cn } from '@repo/utils';
import {
  BookOpen,
  CreditCard,
  LayoutDashboard,
  PieChart,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function FinanceNav() {
  const pathname = usePathname();

  const items = [
    { name: 'Dashboard', href: '/finance/dashboard', icon: LayoutDashboard },
    { name: 'Transactions', href: '/finance/transactions', icon: CreditCard },
    { name: 'Ledger', href: '/finance/ledger', icon: BookOpen },
    { name: 'Staff Plan', href: '/finance/staff', icon: Users },
    { name: 'Equity', href: '/finance/equity', icon: PieChart },
  ];

  return (
    <nav className="flex space-x-2 border-b pb-2 overflow-x-auto">
      {items.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <item.icon className="h-4 w-4" />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}
