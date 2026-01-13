import { Cairo, Poppins } from 'next/font/google';
import type { Metadata } from 'next';
import '../globals.css';
import { GoogleTagManager } from '@next/third-parties/google';
import { notFound } from 'next/navigation';
// NEW: Imports for translation data
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { setRequestLocale } from 'next-intl/server';
import Footer from '@/components/layout/Footer';
import Navbar from '@/components/layout/Navbar';
import SkipLink from '@/components/layout/SkipLink';
import QueryProvider from '@/components/providers/QueryProvider';
import ToastProvider from '@/components/providers/ToastProvider';
import { GlobalLoader } from '@repo/ui';
import { routing } from '@/i18n/navigation';

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

export async function generateMetadata({
  params,
}: Omit<Props, 'children'>): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || 'https://www.theideaiq.com';

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

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <GoogleTagManager gtmId="GTM-KP48FR9R" />
      <body
        className={`
        ${poppins.variable} ${cairo.variable} 
        font-sans antialiased bg-slate-50
      `}
      >
        {/* 3. Wrap everything in the Client Provider */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <QueryProvider>
            <GlobalLoader />
            <SkipLink />
            <ToastProvider />
            <Navbar locale={locale} />
            <main
              id="main-content"
              className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}
            >
              {children}
            </main>
            <Footer />
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
