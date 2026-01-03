import { Poppins, Cairo } from "next/font/google";
import "../globals.css"; 
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastProvider from "@/components/providers/ToastProvider";
import GlobalLoader from "@/components/ui/GlobalLoader";

// NEW: Imports for translation data
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/navigation';

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
});

const cairo = Cairo({
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cairo",
});

export const metadata = {
  title: "The IDEA",
  description: "Innovation for Every Aspect of Life",
};

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; 
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  // 1. Validate the locale against your config
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // 2. Fetch the messages (JSON files) for the client side
  const messages = await getMessages();
  
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={`
        ${poppins.variable} ${cairo.variable} 
        font-sans antialiased bg-slate-50
      `}>
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
