import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

/** Sign-in, authenticator app and no-access pages. */
const AuthLayout = ({ children }: AuthLayoutProps) => {
  const t = useTranslations("admin.meta");

  return (
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
  );
};

export default AuthLayout;
