'use client';

import { buttonVariants } from '@repo/ui';
import { cn } from '@repo/utils';
import { Globe, ShoppingCart, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';

export function DesktopActions({ locale }: { locale: string }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  const iconButtonClasses = cn(
    'text-slate-600 hover:text-brand-dark transition-colors',
    'focus-visible:ring-2 focus-visible:ring-brand-pink focus-visible:ring-offset-2 rounded-full h-11 w-11 flex items-center justify-center outline-none',
  );

  return (
    <>
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
    </>
  );
}

export function MobileActions({ locale }: { locale: string }) {
  const t = useTranslations('Nav');
  const pathname = usePathname();

  return (
    <>
      <div className="flex items-center justify-between py-6 border-b border-slate-50">
        <span className="text-slate-500 font-medium">
          {locale === 'ar' ? 'اللغة' : 'Language'}
        </span>
        <div className="flex gap-4">
          <Link
            href={pathname}
            locale="en"
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
          className={buttonVariants({
            className:
              'w-full h-12 text-lg rounded-xl shadow-lg shadow-brand-dark/10',
          })}
        >
          {t('join')}
        </Link>
        <Link
          href="/login"
          className="block w-full text-center text-slate-600 font-bold py-3 hover:text-brand-dark transition-colors"
        >
          {t('login')}
        </Link>
      </div>
    </>
  );
}
