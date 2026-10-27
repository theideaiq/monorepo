"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { ModeToggle } from "@repo/design-system/components/mode-toggle";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { isCurrentItem, navigationItems } from "@/lib/navigation";
import { AccountActions } from "./account-actions";
import { LanguageSwitcher } from "./language-switcher";

/** Links in the phone menu after the sections. */
const moreLinks = [
  { href: "/partners", id: "business" },
  { href: "/about", id: "about" },
  { href: "/help", id: "help" },
] as const;

/**
 * The site's header: the logo, the same sections as the phone tabs, "For
 * business", then search, saved items, the cart and The IDEA Pass.
 */
export const Header = () => {
  const t = useTranslations("web.nav");
  const common = useTranslations("common");
  const pathname = usePathname();
  const [isOpen, setOpen] = useState(false);
  const themeLabels = {
    dark: common("theme.dark"),
    light: common("theme.light"),
    system: common("theme.system"),
    toggle: common("theme.toggle"),
  };
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container relative mx-auto flex min-h-16 items-center gap-4 px-4">
        <Link aria-label={t("home")} className="shrink-0" href="/">
          <BrandLogo />
        </Link>

        <nav
          aria-label={t("label")}
          className="hidden flex-1 justify-center lg:flex"
        >
          <ul className="flex items-center gap-1">
            {navigationItems.map((item) => {
              const current = isCurrentItem(pathname, item);
              return (
                <li key={item.id}>
                  <Link
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "rounded-md px-3 py-2 font-medium text-sm transition-colors hover:bg-muted",
                      current ? "text-foreground" : "text-muted-foreground"
                    )}
                    href={item.href}
                  >
                    {t(item.id)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="ms-auto flex items-center gap-1">
          <Link
            className="hidden rounded-md px-3 py-2 font-medium text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground lg:block"
            href="/partners"
          >
            {t("business")}
          </Link>
          <div className="hidden items-center gap-1 xl:flex">
            <LanguageSwitcher />
            <ModeToggle labels={themeLabels} />
          </div>
          <AccountActions />
          <Button
            aria-expanded={isOpen}
            aria-label={isOpen ? common("closeMenu") : common("openMenu")}
            className="lg:hidden"
            onClick={() => setOpen(!isOpen)}
            size="icon"
            variant="ghost"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {isOpen ? (
          <nav className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-b bg-background px-4 py-6 shadow-lg lg:hidden">
            <ul className="flex flex-col gap-1">
              {navigationItems.map((item) => (
                <li key={item.id}>
                  <Link
                    aria-current={
                      isCurrentItem(pathname, item) ? "page" : undefined
                    }
                    className="block py-1 text-lg"
                    href={item.href}
                    onClick={close}
                  >
                    {t(item.id)}
                  </Link>
                </li>
              ))}
            </ul>
            <ul className="mt-4 flex flex-col gap-1 border-t pt-4">
              {moreLinks.map((item) => (
                <li key={item.id}>
                  <Link
                    className="block py-1 text-muted-foreground"
                    href={item.href}
                    onClick={close}
                  >
                    {t(item.id)}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
              <LanguageSwitcher />
              <ModeToggle labels={themeLabels} />
            </div>
          </nav>
        ) : null}
      </div>
    </header>
  );
};
