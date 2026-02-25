'use client';

import { motion } from 'framer-motion';
import { Search, ShoppingCart, User } from 'lucide-react';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { useCartStore } from '@/stores/cart-store';
import { useUIStore } from '@/stores/ui-store';

interface WebNavbarProps {
  navItems: { label: string; href: string }[];
  logo?: React.ReactNode;
  desktopActions?: React.ReactNode;
  mobileActions?: React.ReactNode;
  // keeping props for compatibility with layout calling signature, though we might ignore some
  // biome-ignore lint/suspicious/noExplicitAny: Layout compatibility
  [key: string]: any;
}

export function WebNavbar({ navItems, logo }: WebNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();
  const { toggleCart } = useUIStore();
  const cartItems = useCartStore((s) => s.items);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (href: string) => {
    if (href === '/')
      return pathname === '/' || pathname?.match(/^\/[a-z]{2}$/);
    return pathname?.includes(href);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 border-b ${
        isScrolled
          ? 'bg-black/70 backdrop-blur-xl border-white/10 py-3'
          : 'bg-transparent border-transparent py-5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex-shrink-0">
          {logo || (
            <Link href="/" className="flex items-center gap-2">
              <div className="relative w-8 h-8">
                <Image
                  src="/icon.svg"
                  alt="IDEA"
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-xl font-black text-white tracking-tighter">
                IDEA<span className="text-brand-yellow">.</span>
              </span>
            </Link>
          )}
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors hover:text-brand-yellow ${
                isActive(item.href) ? 'text-brand-yellow' : 'text-slate-300'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-white hover:text-brand-yellow transition-colors"
          >
            <Search size={20} />
          </button>

          <Link
            href="/account"
            className="hidden md:block text-white hover:text-brand-yellow transition-colors"
          >
            <User size={20} />
          </Link>

          <button
            type="button"
            onClick={toggleCart}
            className="relative text-white hover:text-brand-yellow transition-colors"
          >
            <ShoppingCart size={20} />
            {mounted && cartItems.length > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-pink text-white text-[9px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
                {cartItems.reduce((acc, i) => acc + i.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </div>
    </motion.header>
  );
}
