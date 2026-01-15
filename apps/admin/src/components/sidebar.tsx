'use client';

import { cn } from '@repo/utils';
import {
  BarChart3,
  BadgeDollarSign,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { type ComponentProps, useState } from 'react';

const sidebarItems = [
  {
    title: 'Overview',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'CRM',
    href: '/crm',
    icon: Users,
  },
  {
    title: 'Finance',
    href: '/finance',
    icon: BadgeDollarSign,
  },
  {
    title: 'Marketing',
    href: '/marketing',
    icon: Megaphone,
  },
  {
    title: 'Products',
    href: '/products',
    icon: Package,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
];

interface SidebarProps extends ComponentProps<'div'> {
  onLinkClick?: () => void;
}

export function Sidebar({ className, onLinkClick, ...props }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div
      className={cn('flex h-full flex-col border-r bg-card', className)}
      {...props}
    >
      <div className="flex h-14 items-center border-b px-4 font-bold text-lg">
        Admin Console
      </div>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {sidebarItems.map((item) => {
            // Check if the current path starts with the item href, but handle root explicitly
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onLinkClick}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground',
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="border-t p-4">
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:pointer-events-none"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </button>
      </div>
    </div>
  );
}
