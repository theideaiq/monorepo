'use client';

import { cn } from '@repo/utils';
import { Home, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY < lastScrollY || currentScrollY < 100);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // biome-ignore lint/correctness/noUnusedVariables: legacy
  const _navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Browse', icon: Search, href: '/megastore' },
    { label: 'Cart', icon: ShoppingBag, href: '/checkout' },
    { label: 'Account', icon: User, href: '/account' },
  ];

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-t border-slate-200 md:hidden transition-transform duration-300',
        isVisible ? 'translate-y-0' : 'translate-y-full',
      )}
    >
      <div className="flex justify-around items-center h-16">
        {_navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center w-full h-full space-y-1',
                isActive ? 'text-blue-600' : 'text-slate-500',
              )}
            >
              <Icon size={24} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
