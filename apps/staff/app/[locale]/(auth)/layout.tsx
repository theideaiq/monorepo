import { BrandLogo } from "@repo/design-system/components/brand-logo";
import {
  LanguageSwitcher,
  ThemeToggle,
} from "@repo/internationalization/controls";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

/** The no-access page (sign-in and the authenticator app are on The IDEA Pass). */
const AuthLayout = ({ children }: AuthLayoutProps) => (
  <div className="flex min-h-dvh flex-col bg-surface">
    <header className="flex items-center justify-between gap-2 p-4">
      <span className="flex items-center gap-2">
        <BrandLogo line="Staff" />
      </span>
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

export default AuthLayout;
