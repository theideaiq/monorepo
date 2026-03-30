'use client';

import { Home, Search, ShoppingBag, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';

export function BottomNav() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const cartItems = useCartStore((state) => state.items.length);

  useEffect(() => {
    // Only show on mobile devices
    const checkMobile = () => {
      setIsVisible(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const _navItems = [
    { label: 'Home', icon: Home, href: '/' },
    { label: 'Browse', icon: Search, href: '/megastore' },
    { label: 'Cart', icon: ShoppingBag, href: '/checkout', badge: cartItems },
    { label: 'Profile', icon: User, href: '/account' },
  ];

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-white/10 px-6 py-4 pb-safe z-50">
      <nav className="flex items-center justify-between">
        {_navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center gap-1 relative transition-colors ${
                isActive
                  ? 'text-brand-yellow'
                  : 'text-slate-500 hover:text-white'
              }`}
            >
              <div className="relative">
                <Icon size={24} />
                {item.badge ? (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand-pink text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-[0_0_10px_rgba(2ec4b6,0.5)]">
                    {item.badge}
                  </span>
                ) : null}
              </div>
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
