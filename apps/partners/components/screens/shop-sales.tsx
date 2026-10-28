"use client";

import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { type Listing, useListings } from "@/lib/listing-queries";
import { useSeller } from "@/lib/seller-queries";
import {
  baghdadDay,
  isOverlap,
  type ListingSale,
  type OpenCampaign,
  type QuantityDeal,
  useCampaignEntries,
  useDeleteDeal,
  useEndSale,
  useJoinCampaign,
  useLeaveCampaign,
  useListingSales,
  useOpenCampaigns,
  useQuantityDeals,
  useSetDeal,
  useSetSale,
} from "@/lib/shop-sale-queries";

const sameListing = (
  listing: Listing,
  row: { condition: string; variant_id: string }
) =>
  row.variant_id === listing.variant_id && row.condition === listing.condition;

/** A new sale: its price and first and last days (Baghdad). */
const SaleForm = ({
  listing,
  sellerId,
}: {
  readonly listing: Listing;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopSales");
  const save = useSetSale(sellerId);
  const id = useId();
  const [price, setPrice] = useState("");
  const [starts, setStarts] = useState("");
  const [ends, setEnds] = useState("");
  const amount = Number(price);
  const valid =
    Number.isInteger(amount) &&
    amount > 0 &&
    amount < listing.price &&
    starts !== "" &&
    ends !== "" &&
    starts <= ends;

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          save.mutate(
            {
              condition: listing.condition,
              ends: baghdadDay(ends, true),
              price: amount,
              starts: baghdadDay(starts),
              variantId: listing.variant_id,
            },
            {
              onSuccess: () => {
                setPrice("");
                setStarts("");
                setEnds("");
              },
            }
          );
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-price`}>{t("salePrice")}</Label>
          <Input
            className="w-36"
            id={`${id}-price`}
            inputMode="numeric"
            onChange={(event) => setPrice(event.target.value)}
            type="number"
            value={price}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-starts`}>{t("starts")}</Label>
          <Input
            id={`${id}-starts`}
            onChange={(event) => setStarts(event.target.value)}
            type="date"
            value={starts}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-ends`}>{t("ends")}</Label>
          <Input
            id={`${id}-ends`}
            onChange={(event) => setEnds(event.target.value)}
            type="date"
            value={ends}
          />
        </div>
        <Button
          disabled={!valid || save.isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {t("addSale")}
        </Button>
      </div>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {isOverlap(save.error) ? t("overlap") : t("saleFailed")}
        </p>
      ) : null}
    </form>
  );
};

/** A new quantity deal: a share off each copy from a quantity on. */
const DealForm = ({
  listing,
  sellerId,
}: {
  readonly listing: Listing;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopSales");
  const save = useSetDeal(sellerId);
  const id = useId();
  const [from, setFrom] = useState("");
  const [rate, setRate] = useState("");
  const quantity = Number(from);
  const share = Number(rate);
  const valid =
    Number.isInteger(quantity) &&
    quantity >= 2 &&
    quantity <= 20 &&
    Number.isInteger(share) &&
    share >= 1 &&
    share <= 50;

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          save.mutate(
            {
              condition: listing.condition,
              fromQuantity: quantity,
              rate: share,
              variantId: listing.variant_id,
            },
            {
              onSuccess: () => {
                setFrom("");
                setRate("");
              },
            }
          );
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor={`${id}-from`}>{t("fromQuantity")}</Label>
          <Input
            className="w-24"
            id={`${id}-from`}
            inputMode="numeric"
            onChange={(event) => setFrom(event.target.value)}
            type="number"
            value={from}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor={`${id}-rate`}>{t("rate")}</Label>
          <Input
            className="w-24"
            id={`${id}-rate`}
            inputMode="numeric"
            onChange={(event) => setRate(event.target.value)}
            type="number"
            value={rate}
          />
        </div>
        <Button
          disabled={!valid || save.isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {t("addDeal")}
        </Button>
      </div>
      {save.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("dealFailed")}
        </p>
      ) : null}
    </form>
  );
};

const ListingRow = ({
  deals,
  listing,
  sales,
  sellerId,
}: {
  readonly deals: readonly QuantityDeal[];
  readonly listing: Listing;
  readonly sales: readonly ListingSale[];
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopSales");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const end = useEndSale(sellerId);
  const remove = useDeleteDeal(sellerId);

  return (
    <li className="grid gap-3 p-3 text-sm">
      <p className="font-medium">
        {locale === "ar" ? listing.name_ar : listing.name_en}
        <span className="text-muted-foreground">
          {" "}
          · {conditions(listing.condition)} ·{" "}
          {formatPrice(listing.price, locale)}
        </span>
      </p>
      {sales.map((sale) => (
        <div className="flex flex-wrap items-center gap-2" key={sale.id}>
          <span>
            {t("sale", {
              ends: formatDate(sale.ends_at, locale),
              price: formatPrice(sale.sale_price, locale),
              starts: formatDate(sale.starts_at, locale),
            })}
          </span>
          <Button
            disabled={end.isPending}
            onClick={() => end.mutate(sale.id)}
            size="sm"
            variant="ghost"
          >
            {t("endSale")}
          </Button>
        </div>
      ))}
      <SaleForm listing={listing} sellerId={sellerId} />
      {deals.map((deal) => (
        <div className="flex flex-wrap items-center gap-2" key={deal.id}>
          <span>
            {t("deal", {
              from: formatNumber(deal.min_quantity, locale),
              rate: formatNumber(deal.discount_rate, locale),
            })}
          </span>
          <Button
            disabled={remove.isPending}
            onClick={() => remove.mutate(deal.id)}
            size="sm"
            variant="ghost"
          >
            {t("removeDeal")}
          </Button>
        </div>
      ))}
      <DealForm listing={listing} sellerId={sellerId} />
    </li>
  );
};

/** One open campaign: the shop's discount in it, or a way to join. */
const CampaignRow = ({
  campaign,
  rate,
  sellerId,
}: {
  readonly campaign: OpenCampaign;
  readonly rate: number | undefined;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopSales");
  const locale = useLocale() as Locale;
  const join = useJoinCampaign(sellerId);
  const leave = useLeaveCampaign(sellerId);
  const id = useId();
  const [value, setValue] = useState(rate === undefined ? "" : String(rate));
  const share = Number(value);
  const valid = Number.isInteger(share) && share >= 5 && share <= 50;

  return (
    <li className="grid gap-2 p-3 text-sm">
      <p className="font-medium">
        {locale === "ar" ? campaign.name_ar : campaign.name_en}
        <span className="text-muted-foreground">
          {" "}
          ·{" "}
          {t("campaignDates", {
            ends: formatDate(campaign.ends_at, locale),
            starts: formatDate(campaign.starts_at, locale),
          })}
        </span>
      </p>
      {(locale === "ar" ? campaign.description_ar : campaign.description_en) ? (
        <p className="text-muted-foreground">
          {locale === "ar" ? campaign.description_ar : campaign.description_en}
        </p>
      ) : null}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) {
            join.mutate({ campaign: campaign.id, rate: share });
          }
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor={`${id}-rate`}>{t("campaignRate")}</Label>
          <Input
            className="w-24"
            id={`${id}-rate`}
            inputMode="numeric"
            onChange={(event) => setValue(event.target.value)}
            type="number"
            value={value}
          />
        </div>
        <Button
          disabled={!valid || join.isPending}
          size="sm"
          type="submit"
          variant="outline"
        >
          {rate === undefined ? t("joinCampaign") : t("updateCampaign")}
        </Button>
        {rate === undefined ? null : (
          <Button
            disabled={leave.isPending}
            onClick={() => leave.mutate(campaign.id)}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("leaveCampaign")}
          </Button>
        )}
      </form>
      {join.isError || leave.isError ? (
        <p className="text-destructive" role="alert">
          {t("campaignFailed")}
        </p>
      ) : null}
    </li>
  );
};

/** Open campaigns the shop can take part in with its own discount. */
const CampaignsCard = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.shopSales");
  const campaigns = useOpenCampaigns();
  const entries = useCampaignEntries(sellerId);
  if ((campaigns.data ?? []).length === 0) {
    return null;
  }
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>{t("campaignsTitle")}</CardTitle>
        <CardDescription>{t("campaignsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-md border">
          {(campaigns.data ?? []).map((campaign) => (
            <CampaignRow
              campaign={campaign}
              key={campaign.id}
              rate={
                (entries.data ?? []).find(
                  (entry) => entry.campaign_id === campaign.id
                )?.discount_rate
              }
              sellerId={sellerId}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

const SalesBody = () => {
  const t = useTranslations("app.company.shopSales");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const listings = useListings(sellerId);
  const sales = useListingSales(sellerId);
  const deals = useQuantityDeals(sellerId);
  const queries = [shop, listings, sales, deals];

  if (queries.some((query) => query.isPending)) {
    return <SectionSpinner />;
  }
  const failed = queries.find((query) => query.isError);
  if (failed) {
    return <ErrorState onRetry={() => failed.refetch()} />;
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const forSale = (listings.data ?? []).filter(
    (listing) => listing.active && listing.available > 0
  );
  return (
    <div className="grid gap-6">
      {canManage ? <CampaignsCard sellerId={sellerId} /> : null}
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {forSale.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noListings")}</p>
          ) : null}
          {forSale.length > 0 && !canManage ? (
            <p className="text-muted-foreground text-sm">{t("ownersOnly")}</p>
          ) : null}
          {forSale.length > 0 && canManage ? (
            <ul className="divide-y rounded-md border">
              {forSale.map((listing) => (
                <ListingRow
                  deals={(deals.data ?? []).filter((deal) =>
                    sameListing(listing, deal)
                  )}
                  key={listing.offer_id}
                  listing={listing}
                  sales={(sales.data ?? []).filter((sale) =>
                    sameListing(listing, sale)
                  )}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Partners → Selling → Sales and deals: a listing's sale price between two
 * days, and a share off each copy from a quantity on.
 */
export const ShopSales = () => (
  <BusinessShell feature="selling">
    <SalesBody />
  </BusinessShell>
);
