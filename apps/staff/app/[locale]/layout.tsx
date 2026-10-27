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

interface LocaleLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{
    locale: string;
  }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.meta");
  return {
    applicationName: t("title"),
    description: t("description"),
    // Staff only: never indexed (robots.txt and X-Robots-Tag say the same).
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

export const viewport: Viewport = {
  themeColor,
  viewportFit: "cover",
};

/**
 * Staff (staff.theideaiq.com), for staff at AAL2: the language comes from
 * the URL (the proxy adds it), so <html lang dir> are right on the server.
 * Its client components get Staff texts. It loads no analytics.
 */
const LocaleLayout = async ({ children, params }: LocaleLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const dir = getDirection(locale);
  const { admin, auth, common, store } = await getMessages();

  return (
    <html className={fonts} dir={dir} lang={locale} suppressHydrationWarning>
      <body className="bg-background">
        <NextIntlClientProvider messages={{ admin, auth, common, store }}>
          <DesignSystemProvider dir={dir} labels={common.ui}>
            {children}
          </DesignSystemProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
