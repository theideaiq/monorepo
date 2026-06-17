'use client';

import { Home, Search, ShoppingCart, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

export function BottomNav() {
  const pathname = usePathname();
  const { toggleCart } = useUIStore();
  const items = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper to check active state
  // Basic check: if href is '/' check exact match, else check startsWith
  const isActive = (href: string) => {
    // Remove locale prefix if present for comparison logic roughly
    // Or just check if pathname contains it.
    // For '/' it's tricky with locale.
    // Let's just assume simple includes for now.
    if (href === '/')
      return pathname === '/' || pathname?.match(/^\/[a-z]{2}$/);
    return pathname?.includes(href);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-xl border-t border-white/10 pb-safe md:hidden">
      <div className="flex justify-around items-center h-16">
        {/* Standard Links */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
        >
          <Home size={20} />
          <span className="text-[10px] font-medium">Home</span>
        </Link>

        <Link
          href="/megastore"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/megastore') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
        >
          <Search size={20} />
          <span className="text-[10px] font-medium">Browse</span>
        </Link>

        {/* Cart Button */}
        <button
          type="button"
          onClick={toggleCart}
          className="flex flex-col items-center justify-center w-full h-full space-y-1 text-slate-500 relative"
        >
          <div className="relative">
            <ShoppingCart size={20} />
            {mounted && items.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-pink text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                {items.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </div>
          <span className="text-[10px] font-medium">Cart</span>
        </button>

        <Link
          href="/account"
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            isActive('/account') ? 'text-brand-yellow' : 'text-slate-500'
          }`}
        >
          <User size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </Link>
      </div>
    </div>
  );
}
