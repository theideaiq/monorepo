"use client";

import { useAuth } from "@repo/auth/provider";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { LightbulbIcon, PackageIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useMyBulbs } from "@/lib/bulbs-queries";
import { isActiveOrder } from "@/lib/orders";
import { useOrders } from "@/lib/store-queries";

const chip =
  "inline-flex shrink-0 items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm transition-colors hover:bg-muted";

/**
 * The only part of My Pass on the storefront: the member's Bulbs and any
 * order on its way; for guests, a nudge to get The IDEA Pass.
 */
export const MemberStrip = () => {
  const t = useTranslations("web.home.member");
  const tiers = useTranslations("app.bulbs.tiers");
  const locale = useLocale();
  const { loading, user } = useAuth();
  const bulbs = useMyBulbs();
  const orders = useOrders();

  if (loading) {
    return <div className="h-10" />;
  }
  if (!user) {
    return (
      <Link className={chip} href="/sign-in">
        <LightbulbIcon aria-hidden="true" className="size-4 text-pink-text" />
        {t("guest")}
      </Link>
    );
  }
  const active = orders.data?.filter((order) => isActiveOrder(order.status));

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
      {bulbs.data ? (
        <Link className={chip} href="/pass/bulbs">
          <LightbulbIcon aria-hidden="true" className="size-4 text-pink-text" />
          {t("bulbs", {
            available: formatNumber(bulbs.data.available, locale),
            tier: tiers(`${bulbs.data.tier}.name`),
          })}
        </Link>
      ) : null}
      {active && active.length > 0 ? (
        <Link className={chip} href="/pass/orders">
          <PackageIcon aria-hidden="true" className="size-4 text-pink-text" />
          {t("orders", { count: formatNumber(active.length, locale) })}
        </Link>
      ) : null}
    </div>
  );
};
