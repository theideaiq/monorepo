import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

interface PassLayoutProperties {
  readonly children: ReactNode;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("pass.meta");
  return {
    description: t("description"),
    // Sign-in pages: never indexed.
    robots: { follow: false, index: false },
    title: { default: t("title"), template: `%s · ${t("title")}` },
  };
};

/**
 * The IDEA Pass inside The IDEA Spark: sign-in, sign-up, the authenticator
 * app and "Your Pass", in one centred card.
 */
const PassLayout = async ({ children }: PassLayoutProperties) => {
  const t = await getTranslations("pass");

  return (
    <div className="flex min-h-dvh flex-col bg-muted/40">
      <header className="flex items-center justify-between gap-2 p-4">
        <Link className="flex items-center gap-2" href="/">
          <BrandLogo />
          <span className="rounded-full bg-brand px-2 py-0.5 font-medium text-brand-foreground text-xs">
            {t("badge")}
          </span>
        </Link>
        <span className="flex items-center">
          <LanguageSwitcher />
          <ThemeToggle />
        </span>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          {children}
        </div>
      </main>
    </div>
  );
};

export default PassLayout;
