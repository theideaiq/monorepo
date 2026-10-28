"use client";

import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { isCurrentItem, navigationItems } from "@/lib/navigation";
import { AccountActions } from "./account-actions";

/**
 * The site's top bar. Wider screens: the logo, Store, Plus and Club, then
 * search, Saved, the bell, the cart and The IDEA Pass. Phones (and the
 * apps): the logo, search, Saved, the bell and the cart; the tabs carry the
 * sections and the Pass. Phones have no footer: My Pass ends with "About &
 * help" (/about), and Pass → Settings has the language and theme.
 */
export const Header = () => {
  const t = useTranslations("web.nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container mx-auto flex min-h-16 items-center gap-4 px-4">
        <Link aria-label={t("home")} className="shrink-0" href="/">
          <BrandLogo />
        </Link>

        <nav
          aria-label={t("label")}
          className="hidden flex-1 justify-center md:flex"
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

        <AccountActions className="ms-auto" />
      </div>
    </header>
  );
};
