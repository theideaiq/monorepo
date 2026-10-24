import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { themeColor } from "@repo/design-system/lib/brand";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDirection, locales } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { env } from "@/env";
import { passSignInLink } from "@/lib/links";
import { Footer } from "./components/footer";
import { Header } from "./components/header";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const viewport: Viewport = { themeColor };

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Lets pages under this layout render statically.
  setRequestLocale(locale);
  const dir = getDirection(locale);
  // Client components only need the shared and marketing texts.
  const { common, web } = await getMessages();

  return (
    <html
      className={cn(fonts, "scroll-smooth")}
      dir={dir}
      lang={locale}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider messages={{ common, web }}>
          <AnalyticsProvider>
            <DesignSystemProvider dir={dir} labels={common.ui}>
              <Header
                appUrl={env.NEXT_PUBLIC_APP_URL}
                signInUrl={passSignInLink(env.NEXT_PUBLIC_APP_URL, locale)}
              />
              {children}
              <Footer />
            </DesignSystemProvider>
          </AnalyticsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
