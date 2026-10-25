"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { Link, usePathname } from "@repo/internationalization/navigation";
import { ShoppingCartIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCartCount } from "@/lib/store-queries";

const CartButton = () => {
  const t = useTranslations("app.nav");
  const locale = useLocale();
  const count = useCartCount();
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

interface AccountActionsProps {
  readonly className?: string;
  readonly onNavigate?: () => void;
}

/**
 * The header's The IDEA Pass part: "Sign in" (coming back to this page)
 * when signed out; the cart and My Pass when signed in.
 */
export const AccountActions = ({
  className,
  onNavigate,
}: AccountActionsProps) => {
  const t = useTranslations("web.nav");
  const { loading, user } = useAuth();
  const locale = useLocale();
  const pathname = usePathname();

  if (loading) {
    return null;
  }
  if (!user) {
    return (
      <Button asChild className={className}>
        <Link
          href={{
            pathname: "/sign-in",
            query: {
              return_to: `/${locale}${pathname === "/" ? "" : pathname}`,
            },
          }}
          onClick={onNavigate}
        >
          {t("signIn")}
        </Link>
      </Button>
    );
  }
  return (
    <span className={cn("flex items-center gap-1", className)}>
      <CartButton />
      <Button asChild>
        <Link href="/pass" onClick={onNavigate}>
          {t("myPass")}
        </Link>
      </Button>
    </span>
  );
};
