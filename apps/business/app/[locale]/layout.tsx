import "../styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { themeColor } from "@repo/design-system/lib/brand";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers";

interface LocaleLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("app.meta");
  return {
    applicationName: t("title"),
    description: t("description"),
    title: { default: t("title"), template: `%s | ${t("title")}` },
  };
};

// Draw under the iOS notch / Android status bar; styles.css adds the insets.
export const viewport: Viewport = {
  themeColor,
  viewportFit: "cover",
};

/**
 * The root layout of The IDEA Business (the back office and The IDEA Business):
 * the language comes from the URL (the proxy adds it), so <html lang dir>
 * are right on the server.
 */
const LocaleLayout = async ({ children, params }: LocaleLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const dir = getDirection(locale);
  const { app, auth, billing, common, store } = await getMessages();

  return (
    <html className={fonts} dir={dir} lang={locale} suppressHydrationWarning>
      <body className="bg-background">
        <NextIntlClientProvider
          messages={{ app, auth, billing, common, store }}
        >
          <DesignSystemProvider dir={dir} labels={common.ui}>
            <AppProviders>{children}</AppProviders>
          </DesignSystemProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
