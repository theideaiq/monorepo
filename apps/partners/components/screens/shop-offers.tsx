"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
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
import { Switch } from "@repo/design-system/components/ui/switch";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { type Listing, useListings } from "@/lib/listing-queries";
import { useSeller } from "@/lib/seller-queries";
import {
  type OfferSetting,
  type ShopOffer,
  useAnswerShopOffer,
  useOfferSettings,
  useSetOfferSettings,
  useShopOffers,
} from "@/lib/shop-offer-queries";

/** A whole number of IQD, or null for an empty field. */
const toAmount = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const amount = Number(trimmed);
  return Number.isInteger(amount) && amount > 0 ? amount : Number.NaN;
};

/** Accept, decline or counter (once) an offer waiting for the shop. */
const AnswerOffer = ({
  offer,
  sellerId,
}: {
  readonly offer: ShopOffer;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopOffers");
  const locale = useLocale() as Locale;
  const answer = useAnswerShopOffer(sellerId);
  const [counter, setCounter] = useState("");
  const counterId = useId();
  const value = Number(counter);
  const validCounter =
    Number.isInteger(value) && offer.amount < value && value < offer.list_price;

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate({ answer: "accept", target: offer.id })}
          size="sm"
        >
          {t("accept", { amount: formatPrice(offer.amount, locale) })}
        </Button>
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate({ answer: "decline", target: offer.id })}
          size="sm"
          variant="outline"
        >
          {t("decline")}
        </Button>
      </div>
      {offer.seller_counter === null ? (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (validCounter) {
              answer.mutate({
                answer: "counter",
                counter: value,
                target: offer.id,
              });
            }
          }}
        >
          <label className="sr-only" htmlFor={counterId}>
            {t("counterLabel")}
          </label>
          <Input
            className="w-36"
            id={counterId}
            inputMode="numeric"
            onChange={(event) => setCounter(event.target.value)}
            placeholder={t("counterPlaceholder")}
            type="number"
            value={counter}
          />
          <Button
            disabled={!validCounter || answer.isPending}
            size="sm"
            type="submit"
            variant="outline"
          >
            {t("counter")}
          </Button>
        </form>
      ) : null}
      {answer.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};

const OfferRow = ({
  canManage,
  offer,
  sellerId,
}: {
  readonly canManage: boolean;
  readonly offer: ShopOffer;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopOffers");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const name =
    (locale === "ar" ? offer.product?.name_ar : offer.product?.name_en) ?? "";

  return (
    <li className="grid gap-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {name}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(offer.condition)}
          </span>
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${offer.status}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {t("amounts", {
          offer: formatPrice(offer.amount, locale),
          price: formatPrice(offer.list_price, locale),
        })}
      </p>
      {offer.status === "open" ? (
        <p>
          {t("answerBy", { time: formatDateTime(offer.expires_at, locale) })}
        </p>
      ) : null}
      {offer.status === "countered" ? (
        <p>
          {t("waitingBuyer", {
            time: formatDateTime(offer.expires_at, locale),
          })}
        </p>
      ) : null}
      {canManage && offer.status === "open" ? (
        <AnswerOffer offer={offer} sellerId={sellerId} />
      ) : null}
    </li>
  );
};

/** One listing's switch and automatic amounts. */
const SettingRow = ({
  listing,
  sellerId,
  setting,
}: {
  readonly listing: Listing;
  readonly sellerId: string;
  readonly setting: OfferSetting | undefined;
}) => {
  const t = useTranslations("app.company.shopOffers");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const save = useSetOfferSettings(sellerId);
  const [accept, setAccept] = useState(setting?.accept_offers ?? false);
  const [acceptAt, setAcceptAt] = useState(
    setting?.auto_accept_at ? String(setting.auto_accept_at) : ""
  );
  const [declineBelow, setDeclineBelow] = useState(
    setting?.auto_decline_below ? String(setting.auto_decline_below) : ""
  );
  const id = useId();
  const at = toAmount(acceptAt);
  const below = toAmount(declineBelow);
  const valid =
    !(Number.isNaN(at) || Number.isNaN(below)) &&
    (at === null || below === null || below <= at);

  return (
    <li className="grid gap-3 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-0 flex-1 font-medium">
          {locale === "ar" ? listing.name_ar : listing.name_en}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(listing.condition)} ·{" "}
            {formatPrice(listing.price, locale)}
          </span>
        </p>
        <div className="flex items-center gap-2">
          <Switch
            checked={accept}
            id={`${id}-accept`}
            onCheckedChange={setAccept}
          />
          <Label htmlFor={`${id}-accept`}>{t("takeOffers")}</Label>
        </div>
      </div>
      {accept ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <Label htmlFor={`${id}-at`}>{t("autoAccept")}</Label>
            <Input
              className="w-36"
              id={`${id}-at`}
              inputMode="numeric"
              onChange={(event) => setAcceptAt(event.target.value)}
              type="number"
              value={acceptAt}
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-below`}>{t("autoDecline")}</Label>
            <Input
              className="w-36"
              id={`${id}-below`}
              inputMode="numeric"
              onChange={(event) => setDeclineBelow(event.target.value)}
              type="number"
              value={declineBelow}
            />
          </div>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={!valid || save.isPending}
          onClick={() =>
            save.mutate({
              accept,
              acceptAt: accept ? at : null,
              condition: listing.condition,
              declineBelow: accept ? below : null,
              variantId: listing.variant_id,
            })
          }
          size="sm"
          variant="outline"
        >
          {save.isPending ? t("saving") : t("save")}
        </Button>
        {save.isSuccess ? (
          <span className="text-muted-foreground" role="status">
            {t("saved")}
          </span>
        ) : null}
        {save.isError || !valid ? (
          <span className="text-destructive" role="alert">
            {t("amountsInvalid")}
          </span>
        ) : null}
      </div>
    </li>
  );
};

/** Which listings take offers, for owners and admins. */
const OfferSettingsCard = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.shopOffers");
  const settings = useOfferSettings(sellerId);
  const listings = useListings(sellerId);
  const forSale = (listings.data ?? []).filter(
    (listing) => listing.active && listing.available > 0
  );
  const settingFor = (listing: Listing) =>
    (settings.data ?? []).find(
      (item) =>
        item.variant_id === listing.variant_id &&
        item.condition === listing.condition
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settingsTitle")}</CardTitle>
        <CardDescription>{t("settingsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {listings.isPending || settings.isPending ? <SectionSpinner /> : null}
        {forSale.length === 0 && listings.data ? (
          <p className="text-muted-foreground text-sm">{t("noListings")}</p>
        ) : null}
        {forSale.length > 0 && settings.data ? (
          <ul className="divide-y rounded-md border">
            {forSale.map((listing) => (
              <SettingRow
                key={listing.offer_id}
                listing={listing}
                sellerId={sellerId}
                setting={settingFor(listing)}
              />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
};

const OffersBody = () => {
  const t = useTranslations("app.company.shopOffers");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const offers = useShopOffers(sellerId);

  if (shop.isPending || (sellerId && offers.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || offers.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : offers.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const all = offers.data ?? [];
  const waiting = all.filter((offer) => offer.status === "open");
  const rest = all.filter((offer) => offer.status !== "open");
  return (
    <div className="grid max-w-3xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("waitingTitle")}</CardTitle>
          <CardDescription>{t("waitingDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {waiting.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneWaiting")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {waiting.map((offer) => (
                <OfferRow
                  canManage={canManage}
                  key={offer.id}
                  offer={offer}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {canManage ? <OfferSettingsCard sellerId={sellerId} /> : null}
      <Card>
        <CardHeader>
          <CardTitle>{t("otherTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rest.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noneOther")}</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {rest.map((offer) => (
                <OfferRow
                  canManage={canManage}
                  key={offer.id}
                  offer={offer}
                  sellerId={sellerId}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Partners → Selling → Offers: offers to answer within 48 hours (silence
 * lets them expire), which listings take offers, and the last 30 days.
 */
export const ShopOffers = () => (
  <BusinessShell feature="selling">
    <OffersBody />
  </BusinessShell>
);
