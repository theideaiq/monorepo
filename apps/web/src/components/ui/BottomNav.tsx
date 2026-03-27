'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function BottomNav() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const { toggleCart } = useUIStore();
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const itemCount = items.reduce((acc, i) => acc + i.quantity, 0);

  // Helper to check active state
  // With @/i18n/navigation, pathname is already unlocalized
  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe md:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around items-center h-16">
        {/* Home */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
          aria-current={isActive('/') ? 'page' : undefined}
        >
          <Home size={20} />
          <span className="text-[10px] font-medium">{t('home')}</span>
        </Link>

        {/* Browse/Megastore */}
        <Link
          href="/megastore"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/megastore') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
          aria-current={isActive('/megastore') ? 'page' : undefined}
        >
          <Search size={20} />
          <span className="text-[10px] font-medium">Browse</span>
        </Link>

        {/* Cart Button */}
        <button
          type="button"
          onClick={toggleCart}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 relative"
          aria-label={mounted ? `${t('cart')}, ${itemCount} items` : t('cart')}
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {mounted && itemCount > 0 && (
              <span
                className="absolute -top-2 -right-2 bg-brand-pink text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full"
                aria-hidden="true"
              >
                {itemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium" aria-hidden="true">
            {t('cart')}
          </span>
        </button>

        {/* Profile */}
        <Link
          href="/account"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/account') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
          aria-current={isActive('/account') ? 'page' : undefined}
        >
          <User size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </nav>
  );
}
