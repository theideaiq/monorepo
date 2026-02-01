import type { Metadata, Viewport } from 'next';
import { Cairo, Poppins } from 'next/font/google';
import '../globals.css';
import { GoogleTagManager } from '@next/third-parties/google';
import { webNavigation } from '@repo/config/navigation';
import { webEnv as env } from '@repo/env/web';
import { SocialIcon } from '@repo/ui';
import { Facebook, Instagram, Linkedin, Twitter } from 'lucide-react';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from 'next-intl/server';
import { BottomNav } from '@/components/layout/BottomNav';
import { CartDrawer } from '@/components/store/CartDrawer';
import SkipLink from '@/components/layout/SkipLink';
import { WebFooter } from '@/components/layout/WebFooter';
import { WebNavbar } from '@/components/layout/WebNavbar';
import QueryProvider from '@/components/providers/QueryProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';
import JsonLd from '@/components/seo/JsonLd';
import { Link, routing } from '@/i18n/navigation';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
});

const cairo = Cairo({
  subsets: ['arabic'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-cairo',
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents pinch-zoom
  themeColor: '#000000',
};

export async function generateMetadata({
  params,
}: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: 'The IDEA',
      template: '%s | The IDEA',
    },
    description: 'Innovation for Every Aspect of Life',
    openGraph: {
      title: 'The IDEA',
      description: 'Innovation for Every Aspect of Life',
      url: baseUrl,
      siteName: 'The IDEA',
      locale: locale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'The IDEA',
      description: 'Innovation for Every Aspect of Life',
    },
  };
}

// Required for static export with next-intl
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  // 1. Validate the locale against your config
  // biome-ignore lint/suspicious/noExplicitAny: migration
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // 2. Fetch the messages (JSON files) for the client side
  const messages = await getMessages();
  const t = await getTranslations();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const baseUrl = env.NEXT_PUBLIC_SITE_URL;

  // Navigation Data
  const navItems = webNavigation.map((item) => ({
    label: t(item.labelKey),
    href: item.href,
  }));

  // Footer Data
  const footerBrand = {
    logo: (
      <Link href="/" className="relative w-8 h-8 block">
        <Image
          src="/icon.svg"
          alt="IDEA Logo"
          fill
          className="object-contain"
        />
      </Link>
    ),
    description: t('Footer.brand_desc'),
    socials: (
      <>
        <SocialIcon
          href="/"
          icon={<Instagram size={18} />}
          label="Follow us on Instagram"
        />
        <SocialIcon
          href="/"
          icon={<Twitter size={18} />}
          label="Follow us on Twitter"
        />
        <SocialIcon
          href="/"
          icon={<Linkedin size={18} />}
          label="Follow us on LinkedIn"
        />
        <SocialIcon
          href="/"
          icon={<Facebook size={18} />}
          label="Follow us on Facebook"
        />
      </>
    ),
  };

  const footerColumns = [
    {
      title: t('Footer.col_shop'),
      links: [
        { label: t('Footer.links.megastore'), href: '/megastore' },
        { label: t('Footer.links.plus'), href: '/plus' },
        { label: t('Footer.links.games'), href: '/megastore?filter=Games' },
        {
          label: t('Footer.links.consoles'),
          href: '/megastore?filter=Consoles',
        },
      ],
    },
    {
      title: t('Footer.col_services'),
      links: [
        { label: t('Footer.links.academy'), href: '/academy' },
        { label: t('Footer.links.suite'), href: '/suite' },
        { label: t('Footer.links.careers'), href: '/careers' },
        { label: t('Footer.links.about'), href: '/about' },
      ],
    },
    {
      title: t('Footer.col_support'),
      links: [
        { label: t('Footer.links.contact'), href: '/contact' },
        { label: t('Footer.links.help'), href: '/faq' },
        { label: t('Footer.links.account'), href: '/account' },
        { label: t('Footer.links.admin'), href: '/admin' },
      ],
    },
    {
      title: t('Footer.col_legal'),
      links: [
        { label: t('Footer.links.terms'), href: '/legal/terms' },
        { label: t('Footer.links.privacy'), href: '/legal/privacy' },
        { label: t('Footer.links.refund'), href: '/legal/refund' },
      ],
    },
  ];

  return (
    <html lang={locale} dir={dir}>
      <GoogleTagManager gtmId="GTM-KP48FR9R" />
      <body
        className={`
        ${poppins.variable} ${cairo.variable} 
        font-sans antialiased
      `}
      >
        <JsonLd baseUrl={baseUrl} />
        <BreadcrumbJsonLd />
        {/* 3. Wrap everything in the Client Provider */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <SkipLink />
            <ToastProvider />
            <WebNavbar navItems={navItems} />
            <CartDrawer />
            <main
              id="main-content"
              className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}
            >
              {children}
            </main>
            <WebFooter
              brand={footerBrand}
              columns={footerColumns}
              copyright={{
                text: t('Footer.copyright'),
                rights: t('Footer.rights'),
                location: t('Footer.location'),
              }}
            />
            <BottomNav />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
