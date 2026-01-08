import { Poppins, Cairo } from 'next/font/google';
import '../globals.css';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import ToastProvider from '@/components/providers/ToastProvider';
import GlobalLoader from '@/components/ui/GlobalLoader';
import Script from 'next/script';

// NEW: Imports for translation data
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
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

export const metadata = {
  title: 'The IDEA',
  description: 'Innovation for Every Aspect of Life',
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // 1. Validate the locale against your config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // 2. Fetch the messages (JSON files) for the client side
  const messages = await getMessages();

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <head>
        <Script
          id="gtm"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-KP48FR9R');`,
          }}
        />
      </head>
      <body
        className={`
        ${poppins.variable} ${cairo.variable} 
        font-sans antialiased bg-slate-50
      `}
      >
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-KP48FR9R"
            height="0"
            width="0"
            style={{ display: 'none', visibility: 'hidden' }}
          />
        </noscript>
        {/* 3. Wrap everything in the Client Provider */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <GlobalLoader />
          <ToastProvider />
          <Navbar locale={locale} />
          <div className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}>
            {children}
          </div>
          <Footer />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
