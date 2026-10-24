import "./styles.css";
import { DesignSystemProvider } from "@repo/design-system";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { fonts } from "@repo/design-system/lib/fonts";
import { getDirection } from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

interface RootLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.meta");
  return {
    description: t("description"),
    // Sign-in pages: never indexed (the X-Robots-Tag header says the same).
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

/**
 * The IDEA Pass: sign-in, sign-up, the authenticator app and the account
 * page, in one centred card.
 */
const RootLayout = async ({ children, params }: RootLayoutProperties) => {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const dir = getDirection(locale);
  const t = await getTranslations("pass");
  // Client components need the shared auth texts and the Pass texts.
  const { auth, common, pass } = await getMessages();

  return (
    <html className={fonts} dir={dir} lang={locale} suppressHydrationWarning>
      <body className="bg-background">
        <NextIntlClientProvider messages={{ auth, common, pass }}>
          <DesignSystemProvider dir={dir} labels={common.ui}>
            <div className="flex min-h-dvh flex-col bg-muted/40">
              <header className="flex items-center justify-between gap-2 p-4">
                <span className="flex items-center gap-2">
                  <BrandLogo />
                  <span className="rounded-full bg-brand px-2 py-0.5 font-medium text-brand-foreground text-xs">
                    {t("badge")}
                  </span>
                </span>
                <span className="flex items-center">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </span>
              </header>
              <main className="flex flex-1 items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-xl border bg-card p-6 text-card-foreground shadow-sm">
                  {children}
                </div>
              </main>
            </div>
          </DesignSystemProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
};

export default RootLayout;
