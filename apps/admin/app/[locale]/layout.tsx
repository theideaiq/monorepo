import "./styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.meta");
  return {
    description: t("description"),
    // Staff only: never indexed (the X-Robots-Tag header says the same).
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const dir = getDirection(locale);
  // Client components need the shared texts and the back-office texts.
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

export default RootLayout;
