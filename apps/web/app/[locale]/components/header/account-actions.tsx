"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { SearchIcon, ShoppingCartIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { NotificationBell } from "@/components/notification-bell";
import { isWithin } from "@/lib/navigation";
import { useCartCount } from "@/lib/store-queries";

/** Sign-in and checkout are focused steps: no search, bell or cart there. */
const FOCUSED = /^\/(checkout|sign-in|sign-out|mfa|onboarding|tg)(\/|$)/;

/** The Store and Plus screens, where the cart always shows. */
const isShopping = (pathname: string) =>
  pathname === "/" ||
  isWithin(pathname, "/store") ||
  isWithin(pathname, "/plus") ||
  isWithin(pathname, "/cart");

/** The cart: on the Store and Plus screens, and anywhere while it holds items. */
const CartButton = ({ pathname }: { readonly pathname: string }) => {
  const t = useTranslations("web.nav");
  const locale = useLocale();
  const count = useCartCount();
  if (count === 0 && !isShopping(pathname)) {
    return null;
  }
  const label =
    count > 0
      ? t("cartCount", { count: formatNumber(count, locale) })
      : t("cart");

  return (
    <Button asChild size="icon" variant="ghost">
      <Link aria-label={label} className="relative" href="/cart">
        <ShoppingCartIcon className="size-5" />
        {count > 0 ? (
          <span
            aria-hidden="true"
            className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 font-semibold text-[0.625rem] text-primary-foreground tabular-nums"
          >
            {formatNumber(count, locale)}
          </span>
        ) : null}
      </Link>
    </Button>
  );
};

/** The first letter of the member's name (or email) for their Pass button. */
const initial = (name: string | undefined, email: string | undefined) =>
  (name?.trim() || email || "?").charAt(0).toUpperCase();

interface AccountActionsProps {
  readonly className?: string;
}

/**
 * The top bar's end: search, the bell (signed in), the cart, then on wider
 * screens The IDEA Pass: "Sign in" (coming back to this page) when signed
 * out, the member's Pass button when signed in. On phones the Pass tab
 * does that.
 */
export const AccountActions = ({ className }: AccountActionsProps) => {
  const t = useTranslations("web.nav");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();
  const focused = FOCUSED.test(pathname);

  let account: ReactNode = null;
  if (user) {
    account = (
      <Button
        asChild
        className="hidden rounded-full md:inline-flex"
        size="icon"
        variant="secondary"
      >
        <Link aria-label={t("pass")} href="/pass">
          <span aria-hidden="true" className="font-semibold">
            {initial(
              user.user_metadata?.full_name as string | undefined,
              user.email
            )}
          </span>
        </Link>
      </Button>
    );
  } else if (!loading) {
    account = (
      <Button asChild className="ms-1 hidden md:inline-flex">
        <Link
          href={{
            pathname: "/sign-in",
            query: { return_to: localePath(locale, pathname) },
          }}
        >
          {t("signIn")}
        </Link>
      </Button>
    );
  }

  return (
    <span className={cn("flex items-center gap-1", className)}>
      {focused ? null : (
        <>
          <Button asChild size="icon" variant="ghost">
            <Link aria-label={t("search")} href="/search">
              <SearchIcon className="size-5" />
            </Link>
          </Button>
          <NotificationBell />
          <CartButton pathname={pathname} />
        </>
      )}
      {account}
    </span>
  );
};
