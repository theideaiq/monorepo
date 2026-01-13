import { Button } from '@repo/ui';
import {
  Building2,
  Gamepad2,
  GraduationCap,
  ShieldCheck,
  ShoppingBag,
  Star,
  Truck,
} from 'lucide-react';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import Hero from '@/components/home/Hero';
import { Card } from '@/components/ui/Card';
import { Link } from '@/i18n/navigation';

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function Home({ params }: Props) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // Use await getTranslations for async server components
  const t = await getTranslations('Home');

  const services = [
    {
      title: t('services.store_title'),
      desc: t('services.store_desc'),
      icon: <ShoppingBag className="w-8 h-8 text-brand-pink" />,
      href: '/megastore',
      color: 'border-brand-pink',
    },
    {
      title: t('services.plus_title'),
      desc: t('services.plus_desc'),
      icon: <Gamepad2 className="w-8 h-8 text-brand-yellow" />,
      href: '/plus',
      color: 'border-brand-yellow',
    },
    {
      title: t('services.academy_title'),
      desc: t('services.academy_desc'),
      icon: <GraduationCap className="w-8 h-8 text-blue-500" />,
      href: '/academy',
      color: 'border-blue-500',
    },
    {
      title: t('services.suite_title'),
      desc: t('services.suite_desc'),
      icon: <Building2 className="w-8 h-8 text-brand-dark" />,
      href: '/suite',
      color: 'border-brand-dark',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      {/* 1. HERO SECTION */}
      <Hero />

      {/* 2. SERVICES GRID */}
      <section className="py-24 px-4 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-brand-dark">
            {t('explore_title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((service, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static list
            <Link key={i} href={service.href}>
              <Card
                className={`p-8 h-full hover:-translate-y-2 transition-transform duration-300 border-t-4 ${service.color}`}
              >
                <div className="mb-6">{service.icon}</div>
                <h3 className="text-xl font-bold text-brand-dark mb-3">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {service.desc}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. WHY CHOOSE US */}
      <section className="bg-brand-dark text-white py-24 px-4 rounded-3xl mx-4 lg:mx-8 mb-20 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="md:w-1/2">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              {t('trust.title')} <br />
              <span className="text-brand-yellow">
                {t('trust.title_highlight')}
              </span>
            </h2>
            <p className="text-slate-400 text-lg mb-8">{t('trust.desc')}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Truck className="text-brand-pink" />
                </div>
                <span className="font-medium">{t('trust.delivery')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <ShieldCheck className="text-brand-yellow" />
                </div>
                <span className="font-medium">{t('trust.genuine')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Star className="text-brand-pink" />
                </div>
                <span className="font-medium">{t('trust.support')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Gamepad2 className="text-brand-yellow" />
                </div>
                <span className="font-medium">{t('trust.content')}</span>
              </div>
            </div>
          </div>

          <div className="md:w-1/2 relative h-[400px] w-full bg-slate-800 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* Placeholder for a cool lifestyle image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-brand-pink/20 to-brand-yellow/20" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/icon.svg"
                alt="IDEA Logo"
                width={100}
                height={100}
                className="opacity-50"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. CTA */}
      <section className="py-20 text-center px-4">
        <h2 className="text-3xl font-bold text-brand-dark mb-6">
          {t('footer_cta')}
        </h2>
        <Link href="/register">
          <Button className="h-14 px-10 text-lg shadow-xl shadow-brand-pink/20">
            {t('footer_btn')}
          </Button>
        </Link>
      </section>
    </div>
  );
}
