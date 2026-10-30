"use client";

import { cn } from "@repo/design-system/lib/utils";
import { Link, usePathname } from "@repo/internationalization/navigation";
import {
  IdCardIcon,
  RepeatIcon,
  ShoppingBagIcon,
  UsersRoundIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { isWithin } from "@/lib/navigation";

const tabs = [
  { href: "/", icon: ShoppingBagIcon, id: "store", match: ["/store"] },
  { href: "/plus", icon: RepeatIcon, id: "plus", match: [] },
  { href: "/club", icon: UsersRoundIcon, id: "club", match: [] },
  { href: "/pass", icon: IdCardIcon, id: "pass", match: [] },
] as const;

/** Focused steps (sign-in, checkout, the Mini App's sign-in) hide the tabs. */
const HIDDEN = /^\/(checkout|sign-in|sign-out|mfa|onboarding|tg|verify)(\/|$)/;

const isActive = (pathname: string, tab: (typeof tabs)[number]) =>
  (tab.href === "/" ? pathname === "/" : isWithin(pathname, tab.href)) ||
  tab.match.some((path) => isWithin(pathname, path));

/**
 * The app's tabs along the bottom of the screen on phones: Store, Plus,
 * Club and Pass (search, the bell and the cart are in the top bar). Wider
 * screens keep the header's menu.
 */
export const TabBar = () => {
  const t = useTranslations("web.tabs");
  const pathname = usePathname();

  if (HIDDEN.test(pathname)) {
    return null;
  }

  return (
    <>
      {/* Keeps the end of each page clear of the bar. */}
      <div
        aria-hidden="true"
        className="h-[calc(4rem+var(--safe-area-inset-bottom,env(safe-area-inset-bottom)))] md:hidden"
      />
      <nav
        aria-label={t("label")}
        className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[var(--safe-area-inset-bottom,env(safe-area-inset-bottom))] md:hidden"
      >
        <ul className="grid h-16 grid-cols-4">
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
                  <Icon aria-hidden="true" className="size-5" />
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
