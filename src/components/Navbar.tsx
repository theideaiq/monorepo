'use client';

import React, { useState } from 'react';
import { Link, usePathname } from '@/navigation'; 
import { Menu, X, ShoppingCart, User, Globe } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl'; // Import this

export default function Navbar({ locale }: { locale: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations('Nav'); // Use the 'Nav' section from your JSON

  return (
    <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="relative w-10 h-10">
               <Image src="/icon.svg" alt="IDEA Logo" fill className="object-contain" />
            </div>
            <span className="text-2xl font-black tracking-tighter text-brand-dark">
              IDEA<span className="text-brand-yellow">.</span>
            </span>
          </Link>

          {/* Desktop Links - Translated */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/megastore" className="text-slate-600 hover:text-brand-pink font-medium transition">{t('store')}</Link>
            <Link href="/plus" className="text-slate-600 hover:text-brand-pink font-medium transition">{t('plus')}</Link>
            <Link href="/academy" className="text-slate-600 hover:text-brand-pink font-medium transition">{t('academy')}</Link>
            <Link href="/suite" className="text-slate-600 hover:text-brand-pink font-medium transition">{t('business')}</Link>
          </div>

          {/* Right Side Icons & Language Switcher */}
          <div className="hidden md:flex items-center space-x-6">
            
            {/* LANGUAGE SWITCHER */}
            <div className="flex items-center gap-2 border-r border-slate-200 pr-6 mr-2">
                <Globe size={18} className="text-slate-400" />
                {locale === 'en' ? (
                    <Link
                      href={pathname}
                      locale="ar"
                      className="font-arabic font-bold text-slate-700 hover:text-brand-pink focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-sm outline-none"
                      aria-label={t('switch_lang_ar')}
                    >
                        عربي
                    </Link>
                ) : (
                    <Link
                      href={pathname}
                      locale="en"
                      className="font-sans font-bold text-slate-700 hover:text-brand-pink focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-sm outline-none"
                      aria-label={t('switch_lang_en')}
                    >
                        English
                    </Link>
                )}
            </div>

            <Link
              href="/account"
              className="text-slate-600 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-full p-1 outline-none transition-colors"
              aria-label={t('account')}
            >
              <User size={22} />
            </Link>
            <Link
              href="/cart"
              className="relative text-slate-600 hover:text-brand-dark focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-full p-1 outline-none transition-colors"
              aria-label={t('cart')}
            >
              <ShoppingCart size={22} />
              <span className="absolute -top-2 -right-2 bg-brand-pink text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </Link>
            <Link href="/register" className="focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-full outline-none">
                <button className="bg-brand-dark text-white px-5 py-2 rounded-full font-bold hover:bg-slate-800 transition shadow-lg shadow-brand-dark/20">
                {t('join')}
                </button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-700 focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-lg p-1 outline-none transition-colors"
              aria-label={isOpen ? t('menu_close') : t('menu_open')}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Translated */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-slate-100">
          <div className="px-4 pt-2 pb-6 space-y-2">
            <Link href="/megastore" className="block py-3 text-slate-600 font-medium border-b border-slate-50">{t('store')}</Link>
            <Link href="/plus" className="block py-3 text-slate-600 font-medium border-b border-slate-50">{t('plus')}</Link>
            <Link href="/academy" className="block py-3 text-slate-600 font-medium border-b border-slate-50">{t('academy')}</Link>
            <Link href="/suite" className="block py-3 text-slate-600 font-medium border-b border-slate-50">{t('business')}</Link>
            
            <div className="flex items-center justify-between py-4">
                 <span className="text-slate-400 text-sm">{locale === 'ar' ? 'اللغة' : 'Language'}</span>
                 <div className="flex gap-4">
                    <Link href={pathname} locale="en" className={`font-bold ${locale === 'en' ? 'text-brand-pink' : 'text-slate-500'}`}>EN</Link>
                    <Link href={pathname} locale="ar" className={`font-bold font-arabic ${locale === 'ar' ? 'text-brand-pink' : 'text-slate-500'}`}>عربي</Link>
                 </div>
            </div>

            <Link href="/login" className="block w-full text-center bg-brand-dark text-white py-3 rounded-xl font-bold mt-4">
              {t('login')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
