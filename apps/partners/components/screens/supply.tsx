"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useSeller } from "@/lib/seller-queries";
import {
  type SupplyItem,
  useSupplyEarnings,
  useSupplyItems,
  useSupplyTerms,
} from "@/lib/supply-queries";

const CONDITIONS = new Set(["new", "used", "refurbished", "open_box"]);
const STATUSES = new Set([
  "available",
  "reserved",
  "sold",
  "rented",
  "repair",
  "retired",
  "active",
]);

/** The fees staff agreed with the shop (owners and admins). */
const Terms = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.supply");
  const locale = useLocale() as Locale;
  const terms = useSupplyTerms(sellerId);

  if (terms.isPending) {
    return <SectionSpinner />;
  }
  if (terms.isError) {
    return <ErrorState onRetry={() => terms.refetch()} />;
  }
  if (!terms.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("terms.title")}</CardTitle>
          <CardDescription>{t("terms.none")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { data } = terms;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("terms.title")}
          <Badge variant={data.active ? "secondary" : "outline"}>
            {t(data.active ? "terms.active" : "terms.paused")}
          </Badge>
        </CardTitle>
        <CardDescription>{t("terms.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm">
        <p>
          {t("terms.rentalFee", { fee: formatPrice(data.rental_fee, locale) })}
        </p>
        <p>{t("terms.kitFee", { fee: formatPrice(data.kit_fee, locale) })}</p>
        {data.note ? (
          <p className="text-muted-foreground">{data.note}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {t("terms.updated", { date: formatDate(data.updated_at, locale) })}
        </p>
      </CardContent>
    </Card>
  );
};

const ItemRow = ({ item }: { readonly item: SupplyItem }) => {
  const t = useTranslations("app");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const name = (locale === "ar" ? item.name_ar : item.name_en) ?? "";
  const details = [
    t(
      item.kind === "kit"
        ? "company.supply.items.kit"
        : "company.supply.items.copy"
    ),
  ];
  if (item.condition && CONDITIONS.has(item.condition)) {
    details.push(conditions(item.condition as "new"));
  }
  return (
    <li className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground text-xs">
          {details.join(" · ")}
        </span>
      </span>
      {STATUSES.has(item.status) ? (
        <Badge variant="secondary">
          {t(`company.supply.status.${item.status as "available"}`)}
        </Badge>
      ) : null}
      <span className="text-muted-foreground tabular-nums">
        {t("company.supply.items.rentals", {
          count: formatNumber(item.rentals, locale),
        })}
      </span>
    </li>
  );
};

/** The shop's copies and kit units The IDEA holds (every member). */
const Items = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.supply.items");
  const items = useSupplyItems(sellerId);

  if (items.isPending) {
    return <SectionSpinner />;
  }
  if (items.isError) {
    return <ErrorState onRetry={() => items.refetch()} />;
  }
  const all = items.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {all.map((item) => (
              <ItemRow item={item} key={`${item.kind}-${item.id}`} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

/** What each rental or booking earned, and whether it was paid. */
const Earnings = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.supply.earnings");
  const locale = useLocale() as Locale;
  const earnings = useSupplyEarnings(sellerId);

  if (earnings.isPending) {
    return <SectionSpinner />;
  }
  if (earnings.isError) {
    return <ErrorState onRetry={() => earnings.refetch()} />;
  }
  const all = earnings.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}{" "}
          <Link className="underline" href="/selling/payouts">
            {t("payouts")}
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {all.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("none")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {all.map((row) => (
              <li
                className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm"
                key={row.id}
              >
                <span className="grid min-w-0 flex-1 gap-0.5">
                  <span>
                    {t(row.kind === "kit" ? "kit" : "rental", {
                      name: row.label,
                    })}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDate(`${row.earned_on}T12:00:00`, locale)}
                    {" · "}
                    {t(row.payout_line_id ? "paid" : "due")}
                  </span>
                </span>
                <span className="tabular-nums">
                  {formatPrice(row.fee, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const SupplyBody = () => {
  const t = useTranslations("app.company.supply");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);

  if (shop.isPending) {
    return <SectionSpinner />;
  }
  if (shop.isError) {
    return <ErrorState onRetry={() => shop.refetch()} />;
  }
  const seller = shop.data?.seller;
  if (seller?.status !== "approved") {
    return (
      <div className="grid max-w-xl gap-2">
        <p>{t("needsShop")}</p>
        <Link className="text-sm underline" href="/selling">
          {t("toSelling")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <p className="text-muted-foreground">{t("description")}</p>
      {canManage ? <Terms sellerId={seller.id} /> : null}
      <Items sellerId={seller.id} />
      {canManage ? <Earnings sellerId={seller.id} /> : null}
    </div>
  );
};

/**
 * Partners → Supply: copies the shop lends to the Plus pool and kit units
 * it lends to game nights, with the fee each rental or booking earns (paid
 * with the weekly payout).
 */
export const Supply = () => (
  <BusinessShell feature="supply">
    <SupplyBody />
  </BusinessShell>
);
