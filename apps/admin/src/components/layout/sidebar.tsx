'use client';

import { adminNavigation } from '@repo/config/navigation';
import { Button } from '@repo/ui';
import { cn } from '@repo/utils';
import {
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
import { type ComponentProps, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  BadgeDollarSign,
  Megaphone,
  Package,
  Settings,
};

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
    <div className={cn('flex h-full flex-col', className)} {...props}>
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          {adminNavigation.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
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
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-white/10 hover:text-white',
                  isActive
                    ? 'bg-brand-pink text-white shadow-md'
                    : 'text-slate-400',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t border-white/10">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full justify-start gap-3 px-3 py-2 text-slate-400 hover:bg-white/10 hover:text-white"
        >
          {isSigningOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {isSigningOut ? 'Signing out...' : 'Sign Out'}
        </Button>
      </div>
    </div>
  );
}
