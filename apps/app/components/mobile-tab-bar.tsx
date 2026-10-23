"use client";

import { useSidebar } from "@repo/design-system/components/ui/sidebar";
import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { MenuIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartCount } from "@/lib/store-queries";
import { isActivePath, navItems, tabBarKeys } from "./nav-items";

const tabClass =
  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[0.6875rem] text-muted-foreground transition-colors";

/**
 * The phone tab bar: the main sections at thumb reach, "More" opens the
 * sidebar with the rest. Hidden from tablet width up, where the sidebar shows.
 */
export const MobileTabBar = () => {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const cartCount = useCartCount();
  const tabs = navItems.filter((item) => tabBarKeys.includes(item.key));

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn(tabClass, active && "font-medium text-primary")}
            href={item.href}
            key={item.key}
          >
            <span className="relative">
              <item.icon className="size-5" />
              {item.key === "cart" && cartCount > 0 ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute -end-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[0.625rem] text-primary-foreground tabular-nums"
                  >
                    {formatNumber(cartCount, locale)}
                  </span>
                  <span className="sr-only">
                    {t("cartCount", { count: formatNumber(cartCount, locale) })}
                  </span>
                </>
              ) : null}
            </span>
            <span className="truncate">{t(item.key)}</span>
          </Link>
        );
      })}
      <button
        className={tabClass}
        onClick={() => setOpenMobile(true)}
        type="button"
      >
        <MenuIcon className="size-5" />
        <span className="truncate">{t("more")}</span>
      </button>
    </nav>
  );
};
