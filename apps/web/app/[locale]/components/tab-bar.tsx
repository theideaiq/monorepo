"use client";

import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import {
  CompassIcon,
  IdCardIcon,
  RepeatIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartCount } from "@/lib/store-queries";

const tabs = [
  { href: "/", icon: ShoppingBagIcon, id: "shop", match: ["/store"] },
  { href: "/plus", icon: RepeatIcon, id: "rent", match: [] },
  { href: "/post", icon: CompassIcon, id: "discover", match: ["/club"] },
  { href: "/cart", icon: ShoppingCartIcon, id: "cart", match: [] },
  { href: "/pass", icon: IdCardIcon, id: "pass", match: [] },
] as const;

/** Focused steps (sign-in, checkout, the Mini App's sign-in) hide the tabs. */
const HIDDEN = /^\/(checkout|sign-in|sign-up|sign-out|mfa|onboarding|tg)(\/|$)/;

const within = (pathname: string, path: string) =>
  pathname === path || pathname.startsWith(`${path}/`);

const isActive = (pathname: string, tab: (typeof tabs)[number]) =>
  tab.href === "/"
    ? pathname === "/" || tab.match.some((path) => within(pathname, path))
    : within(pathname, tab.href) ||
      tab.match.some((path) => within(pathname, path));

/**
 * The app's tabs along the bottom of the screen on phones: Shop, Rent,
 * Discover, Cart and My Pass. Wider screens keep the header's menu.
 */
export const TabBar = () => {
  const t = useTranslations("web.tabs");
  const locale = useLocale();
  const pathname = usePathname();
  const count = useCartCount();

  if (HIDDEN.test(pathname)) {
    return null;
  }

  return (
    <>
      {/* Keeps the end of each page clear of the bar. */}
      <div
        aria-hidden="true"
        className="h-[calc(4rem+env(safe-area-inset-bottom))] md:hidden"
      />
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      >
        <ul className="grid h-16 grid-cols-5">
          {tabs.map((tab) => {
            const active = isActive(pathname, tab);
            const Icon = tab.icon;
            return (
              <li key={tab.id}>
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full flex-col items-center justify-center gap-1 font-medium text-[0.6875rem] transition-colors",
                    active
                      ? "text-pink-text"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  href={tab.href}
                >
                  <span className="relative">
                    <Icon aria-hidden="true" className="size-5" />
                    {tab.id === "cart" && count > 0 ? (
                      <span className="absolute -end-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[0.625rem] text-primary-foreground tabular-nums">
                        {formatNumber(count, locale)}
                      </span>
                    ) : null}
                  </span>
                  {t(tab.id)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
