import "./styles.css";
import { AnalyticsProvider } from "@repo/analytics/provider";
import { DesignSystemProvider } from "@repo/design-system";
import { themeColor } from "@repo/design-system/lib/brand";
import { fonts } from "@repo/design-system/lib/fonts";
import { cn } from "@repo/design-system/lib/utils";
import { getDirection, locales } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers";
import { Footer } from "./components/footer";
import { Header } from "./components/header";
import { SiteChrome } from "./components/site-chrome";
import { TabBar } from "./components/tab-bar";
import { WebOnly } from "./components/web-only";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

// The notch and home bar: content can reach the edges (safe-area insets
// keep the tab bar clear). Pinch zoom stays available.
export const viewport: Viewport = { themeColor, viewportFit: "cover" };

// Added to the home screen, the site opens full screen like an app.
export const metadata: Metadata = {
  appleWebApp: { capable: true, statusBarStyle: "default", title: "The IDEA" },
};

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  // Lets pages under this layout render statically.
  setRequestLocale(locale);
  const dir = getDirection(locale);
  // Texts the client components use: shared, The IDEA Pass and Your Pass,
  // the store and the marketing pages.
  const { app, auth, billing, common, pass, store, web } = await getMessages();

  return (
    <html
      className={cn(fonts, "scroll-smooth")}
      data-scroll-behavior="smooth"
      dir={dir}
      lang={locale}
      suppressHydrationWarning
    >
      <body>
        <NextIntlClientProvider
          messages={{ app, auth, billing, common, pass, store, web }}
        >
          <AnalyticsProvider>
            <DesignSystemProvider dir={dir} labels={common.ui}>
              <AppProviders>
                <SiteChrome>
                  <Header />
                </SiteChrome>
                {children}
                <SiteChrome>
                  <WebOnly>
                    <Footer />
                  </WebOnly>
                  <TabBar />
                </SiteChrome>
              </AppProviders>
            </DesignSystemProvider>
          </AnalyticsProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
