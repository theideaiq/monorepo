"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { localePath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { BellIcon, BellOffIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { productHref } from "@/components/store/product-card";
import { useNotifyMe } from "@/lib/wishlist-queries";

/**
 * A product nobody has on offer: "Notify me" saves it to Saved with "Tell
 * me" on, so the bell says when a copy goes on sale (or when it's out).
 * Signed out, it goes to sign-in first.
 */
export const NotifyMe = ({
  productId,
  slug,
}: {
  readonly productId: string;
  readonly slug: string;
}) => {
  const t = useTranslations("app.store.product.notify");
  const locale = useLocale();
  const { user } = useAuth();
  const { loading, on, toggle } = useNotifyMe(productId);
  if (!user) {
    return (
      <div className="grid gap-2">
        <p className="text-muted-foreground text-sm">{t("none")}</p>
        <Button asChild className="justify-self-start" variant="outline">
          <Link
            href={{
              pathname: "/sign-in",
              query: { return_to: localePath(locale, productHref(slug)) },
            }}
          >
            <BellIcon />
            {t("notify")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-sm" role="status">
        {on ? t("waiting") : t("none")}
      </p>
      <Button
        aria-pressed={on}
        className="justify-self-start"
        disabled={loading || toggle.isPending}
        onClick={() => toggle.mutate(!on)}
        variant="outline"
      >
        {on ? <BellOffIcon /> : <BellIcon />}
        {on ? t("stop") : t("notify")}
      </Button>
      {toggle.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
