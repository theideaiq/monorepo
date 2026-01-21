'use client';

import { buttonVariants } from '@repo/ui';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';

export default function Hero() {
  const t = useTranslations('Home');

  return (
    <section className="relative px-4 py-20 lg:py-32 overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto relative z-10 text-center">
        <div className="animate-fade-in-up">
          <span className="inline-block py-1 px-3 rounded-full bg-brand-pink/10 text-brand-pink text-sm font-bold tracking-wide mb-6">
            {t('badge')}
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-brand-dark mb-6">
            {t('title_start')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-pink to-brand-yellow">
              {t('title_end')}
            </span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/register"
              className={buttonVariants({
                className: 'h-14 px-8 text-lg w-full sm:w-auto',
              })}
            >
              {t('cta_primary')}
              <ArrowRight
                className="ml-2 rtl:rotate-180"
                size={20}
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/about"
              className={buttonVariants({
                variant: 'outline',
                className: 'h-14 px-8 text-lg w-full sm:w-auto',
              })}
            >
              {t('cta_secondary')}
            </Link>
          </div>
        </div>
      </div>

      {/* Abstract Background Blobs */}
      <div
        className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-yellow/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-brand-pink/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"
        aria-hidden="true"
      />
    </section>
  );
}
