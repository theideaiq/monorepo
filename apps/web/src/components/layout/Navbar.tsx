'use client';

import { buttonVariants } from '@repo/ui';
import { cn } from '@repo/utils';
import { Globe, Menu, ShoppingCart, User, X } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';

export default function Navbar({ locale }: { locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Nav');

  // Shared classes for consistency
  const navLinkClasses = cn(
    'text-slate-600 hover:text-brand-pink font-medium transition',
    'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-md outline-none px-3 py-2',
  );

  const iconButtonClasses = cn(
    'text-slate-600 hover:text-brand-dark transition-colors',
    'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-full h-11 w-11 flex items-center justify-center outline-none',
  );

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 p-2 rounded-lg focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 outline-none">
            <div className="relative w-10 h-10">
              <Image
                src="/icon.svg"
                alt="IDEA Logo"
                fill
                className="object-contain"
              />
            </div>
            <span className="text-2xl font-black tracking-tighter text-brand-dark">
              IDEA<span className="text-brand-yellow">.</span>
            </span>
          </Link>

          {/* Desktop Links - Translated */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/megastore" className={navLinkClasses}>
              {t('store')}
            </Link>
            <Link href="/plus" className={navLinkClasses}>
              {t('plus')}
            </Link>
            <Link href="/academy" className={navLinkClasses}>
              {t('academy')}
            </Link>
            <Link href="/suite" className={navLinkClasses}>
              {t('business')}
            </Link>
          </div>

          {/* Right Side Icons & Language Switcher */}
          <div className="hidden md:flex items-center space-x-2">
            {/* LANGUAGE SWITCHER */}
            <div className="flex items-center border-r border-slate-200 pr-4 mr-2">
              <Link
                href={pathname}
                locale={locale === 'en' ? 'ar' : 'en'}
                className={cn(
                  'flex items-center gap-2 font-bold text-slate-700 hover:text-brand-pink px-3 py-2',
                  'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-md outline-none',
                  locale === 'en' ? 'font-arabic' : 'font-sans',
                )}
                aria-label={
                  locale === 'en' ? t('switch_lang_ar') : t('switch_lang_en')
                }
              >
                <Globe size={18} className="text-slate-400" />
                {locale === 'en' ? 'عربي' : 'English'}
              </Link>
            </div>

            <Link
              href="/account"
              className={iconButtonClasses}
              aria-label={t('account')}
            >
              <User size={22} />
            </Link>
            <Link
              href="/cart"
              className={cn(iconButtonClasses, 'relative')}
              aria-label={t('cart')}
            >
              <ShoppingCart size={22} />
              <span className="absolute top-2 right-2 bg-brand-pink text-white text-[0.625rem] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                0
              </span>
            </Link>
            <div className="pl-2">
              <Link
                href="/register"
                className={buttonVariants({
                  className: 'rounded-full shadow-lg shadow-brand-dark/20',
                })}
              >
                {t('join')}
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className={cn(
                'text-slate-700 h-11 w-11 flex items-center justify-center rounded-lg transition-colors outline-none',
                'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2',
              )}
              aria-label={isOpen ? t('menu_close') : t('menu_open')}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Translated */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 h-[calc(100vh-80px)] overflow-y-auto">
          <div className="px-4 pt-2 pb-6 space-y-2">
            {[
              { href: '/megastore', label: t('store') },
              { href: '/plus', label: t('plus') },
              { href: '/academy', label: t('academy') },
              { href: '/suite', label: t('business') },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="block py-4 text-lg text-slate-900 font-bold border-b border-slate-50 hover:text-brand-pink transition-colors"
              >
                {item.label}
              </Link>
            ))}

            <div className="flex items-center justify-between py-6 border-b border-slate-50">
              <span className="text-slate-500 font-medium">
                {locale === 'ar' ? 'اللغة' : 'Language'}
              </span>
              <div className="flex gap-4">
                <Link
                  href={pathname}
                  locale="en"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'font-bold transition-colors p-2',
                    locale === 'en'
                      ? 'text-brand-pink'
                      : 'text-slate-500 hover:text-brand-pink',
                  )}
                >
                  English
                </Link>
                <Link
                  href={pathname}
                  locale="ar"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'font-bold font-arabic transition-colors p-2',
                    locale === 'ar'
                      ? 'text-brand-pink'
                      : 'text-slate-500 hover:text-brand-pink',
                  )}
                >
                  عربي
                </Link>
              </div>
            </div>

            <div className="pt-6 space-y-4">
              <Link
                href="/register"
                onClick={() => setIsOpen(false)}
                className={buttonVariants({
                  className: 'w-full h-12 text-lg rounded-xl shadow-lg shadow-brand-dark/10',
                })}
              >
                {t('join')}
              </Link>
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block w-full text-center text-slate-600 font-bold py-3 hover:text-brand-dark transition-colors"
              >
                {t('login')}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
