"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { isActivePath, navItems } from "./nav-items";

/**
 * The sections of Your Pass: a column beside the page from tablet width up,
 * a row that scrolls sideways on phones.
 */
export const PassNav = () => {
  const t = useTranslations("app.nav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0"
    >
      <ul className="flex gap-1 md:flex-col">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);
          return (
            <li className="shrink-0" key={item.key}>
              <Link
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-muted-foreground text-sm transition-colors hover:bg-muted hover:text-foreground",
                  active && "bg-muted font-medium text-foreground"
                )}
                href={item.href}
              >
                <item.icon className="size-4 shrink-0" />
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
