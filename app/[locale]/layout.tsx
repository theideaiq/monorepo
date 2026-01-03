import { Poppins, Cairo } from "next/font/google";
// FIXED: Path now goes up two levels to find the CSS in the root app folder
import "../globals.css"; 
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ToastProvider from "@/components/providers/ToastProvider";
import GlobalLoader from "@/components/ui/GlobalLoader";

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
  title: "The IDEA IQ",
  description: "Innovation for Every Aspect of Life",
};

// FIXED: Define the type where params is a Promise
type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>; 
};

// FIXED: Added 'async' so we can await the params
export default async function LocaleLayout({ children, params }: Props) {
  
  // FIXED: We MUST await the params to get the locale in Next.js 15+
  const { locale } = await params;
  
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir}>
      <body className={`
        ${poppins.variable} ${cairo.variable} 
        font-sans antialiased bg-slate-50
      `}>
        <GlobalLoader />
        <ToastProvider />
        <Navbar locale={locale} /> 
        {/* We use the Cairo font if the direction is RTL */}
        <div className={dir === 'rtl' ? 'font-arabic' : 'font-sans'}>
            {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}

