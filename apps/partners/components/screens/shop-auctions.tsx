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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useListings } from "@/lib/listing-queries";
import { useSeller } from "@/lib/seller-queries";
import {
  AUCTION_DAYS,
  AUCTION_MARKS,
  type AuctionMark,
  auctionRefusal,
  MAX_PHOTOS,
  MIN_PHOTOS,
  type ShopAuction,
  useAuctionAction,
  useAuctionMinimum,
  useShopAuctions,
  useStartAuction,
} from "@/lib/shop-auction-queries";

type Problem =
  | "category"
  | "copy"
  | "days"
  | "failed"
  | "hasBids"
  | "minimum"
  | "newCopy"
  | "noBidder"
  | "note"
  | "photos"
  | "rental"
  | "reserve"
  | "secondChance";

/** The database's refusals, by how their message starts. */
const PROBLEMS: [prefix: string, key: Problem][] = [
  ["New copies need", "newCopy"],
  ["This category isn't open", "category"],
  ["Rentals can't", "rental"],
  ["Auctions start at", "minimum"],
  ["A reserve is above", "reserve"],
  ["Auctions run", "days"],
  ["Add 3 to 12 photos", "photos"],
  ["Describe the copy", "note"],
  ["That copy isn't available", "copy"],
  ["Only an auction without bids", "hasBids"],
  ["A second chance is offered once", "secondChance"],
  ["No other bidder", "noBidder"],
];

const problemOf = (error: unknown): Problem => {
  const message =
    auctionRefusal(error) ??
    (typeof error === "object" && error !== null && "message" in error
      ? String(error.message)
      : "");
  return (
    PROBLEMS.find(([prefix]) => message.startsWith(prefix))?.[1] ?? "failed"
  );
};

/** A whole number of IQD, or null for an empty field. */
const toAmount = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") {
    return null;
  }
  const amount = Number(trimmed);
  return Number.isInteger(amount) && amount > 0 ? amount : Number.NaN;
};

interface StartFormState {
  days: number;
  listing: string;
  mark: AuctionMark | "";
  note: string;
  photos: File[];
  reserve: string;
  start: string;
}

const EMPTY_FORM: StartFormState = {
  days: 7,
  listing: "",
  mark: "",
  note: "",
  photos: [],
  reserve: "",
  start: "",
};

/** Whether the form can be sent: what the database checks, early. */
const formReady = (form: StartFormState, minimum: number) => {
  const start = toAmount(form.start);
  const reserve = toAmount(form.reserve);
  return (
    form.listing !== "" &&
    start !== null &&
    start >= minimum &&
    !Number.isNaN(reserve) &&
    (reserve === null || reserve > start) &&
    form.photos.length >= MIN_PHOTOS &&
    form.photos.length <= MAX_PHOTOS &&
    form.note.trim().length >= 10
  );
};

/** Put a copy of one of the shop's listings up for auction. */
const StartAuction = ({ sellerId }: { readonly sellerId: string }) => {
  const t = useTranslations("app.company.shopAuctions");
  const tMarks = useTranslations("app.auctions.marks");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const listings = useListings(sellerId);
  const minimum = useAuctionMinimum().data ?? 25_000;
  const start = useStartAuction(sellerId);
  const [form, setForm] = useState<StartFormState>(EMPTY_FORM);
  const id = useId();
  const options = (listings.data ?? []).filter((listing) => listing.active);
  const chosen = options.find((listing) => listing.offer_id === form.listing);
  const ready = formReady(form, minimum);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!(ready && chosen)) {
      return;
    }
    start.mutate(
      {
        condition: chosen.condition,
        days: form.days,
        mark: form.mark || null,
        note: form.note.trim(),
        photos: form.photos,
        reserve: toAmount(form.reserve),
        startPrice: toAmount(form.start) ?? 0,
        variantId: chosen.variant_id,
      },
      { onSuccess: () => setForm(EMPTY_FORM) }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("startTitle")}</CardTitle>
        <CardDescription>
          {t("startDescription", { minimum: formatPrice(minimum, locale) })}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-listing`}>{t("listing")}</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              id={`${id}-listing`}
              onChange={(event) =>
                setForm({ ...form, listing: event.target.value })
              }
              value={form.listing}
            >
              <option value="">{t("chooseListing")}</option>
              {options.map((listing) => (
                <option key={listing.offer_id} value={listing.offer_id}>
                  {locale === "ar" ? listing.name_ar : listing.name_en} ·{" "}
                  {conditions(listing.condition)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-mark`}>{t("mark")}</Label>
            <select
              className="h-9 rounded-md border bg-background px-3 text-sm"
              id={`${id}-mark`}
              onChange={(event) =>
                setForm({
                  ...form,
                  mark: event.target.value as AuctionMark | "",
                })
              }
              value={form.mark}
            >
              <option value="">{t("noMark")}</option>
              {AUCTION_MARKS.map((mark) => (
                <option key={mark} value={mark}>
                  {tMarks(mark)}
                </option>
              ))}
            </select>
            <p className="text-muted-foreground text-xs">{t("markHint")}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="grid gap-1">
              <Label htmlFor={`${id}-start`}>{t("startPrice")}</Label>
              <Input
                className="w-40"
                id={`${id}-start`}
                inputMode="numeric"
                min={minimum}
                onChange={(event) =>
                  setForm({ ...form, start: event.target.value })
                }
                type="number"
                value={form.start}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${id}-reserve`}>{t("reserve")}</Label>
              <Input
                className="w-40"
                id={`${id}-reserve`}
                inputMode="numeric"
                onChange={(event) =>
                  setForm({ ...form, reserve: event.target.value })
                }
                type="number"
                value={form.reserve}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor={`${id}-days`}>{t("days")}</Label>
              <select
                className="h-9 rounded-md border bg-background px-3 text-sm"
                id={`${id}-days`}
                onChange={(event) =>
                  setForm({ ...form, days: Number(event.target.value) })
                }
                value={form.days}
              >
                {AUCTION_DAYS.map((days) => (
                  <option key={days} value={days}>
                    {t("daysOption", { days: formatNumber(days, locale) })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="text-muted-foreground text-xs">{t("reserveHint")}</p>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-photos`}>{t("photos")}</Label>
            <Input
              accept="image/png,image/jpeg,image/webp"
              id={`${id}-photos`}
              multiple
              onChange={(event) =>
                setForm({
                  ...form,
                  photos: Array.from(event.target.files ?? []).slice(
                    0,
                    MAX_PHOTOS
                  ),
                })
              }
              type="file"
            />
            <p className="text-muted-foreground text-xs">
              {t("photosHint", {
                count: formatNumber(form.photos.length, locale),
              })}
            </p>
          </div>
          <div className="grid gap-1">
            <Label htmlFor={`${id}-note`}>{t("note")}</Label>
            <Textarea
              id={`${id}-note`}
              maxLength={2000}
              onChange={(event) =>
                setForm({ ...form, note: event.target.value })
              }
              rows={4}
              value={form.note}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!ready || start.isPending} type="submit">
              {start.isPending ? t("starting") : t("start")}
            </Button>
            {start.isSuccess ? (
              <span className="text-muted-foreground text-sm" role="status">
                {t("started")}
              </span>
            ) : null}
            {start.isError ? (
              <span className="text-destructive text-sm" role="alert">
                {t(`problems.${problemOf(start.error)}`, {
                  minimum: formatPrice(minimum, locale),
                })}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

/** Cancel before any bid; after an unpaid win, a second chance or close. */
const AuctionRowActions = ({
  auction,
  sellerId,
}: {
  readonly auction: ShopAuction;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopAuctions");
  const act = useAuctionAction(sellerId);
  const run = (
    action: "cancel_auction" | "close_auction" | "offer_second_chance"
  ) => act.mutate({ action, target: auction.id });
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {auction.status === "live" && auction.bid_count === 0 ? (
          <Button
            disabled={act.isPending}
            onClick={() => run("cancel_auction")}
            size="sm"
            variant="outline"
          >
            {t("cancel")}
          </Button>
        ) : null}
        {auction.status === "unpaid" && !auction.second_chance ? (
          <Button
            disabled={act.isPending}
            onClick={() => run("offer_second_chance")}
            size="sm"
          >
            {t("secondChance")}
          </Button>
        ) : null}
        {auction.status === "unpaid" ? (
          <Button
            disabled={act.isPending}
            onClick={() => run("close_auction")}
            size="sm"
            variant="outline"
          >
            {t("close")}
          </Button>
        ) : null}
      </div>
      {act.isError ? (
        <p className="text-destructive" role="alert">
          {t(`problems.${problemOf(act.error)}`, { minimum: "" })}
        </p>
      ) : null}
    </>
  );
};

/** One auction: its state, price, reserve and what the shop can do. */
const AuctionRow = ({
  auction,
  canManage,
  sellerId,
}: {
  readonly auction: ShopAuction;
  readonly canManage: boolean;
  readonly sellerId: string;
}) => {
  const t = useTranslations("app.company.shopAuctions");
  const tMarks = useTranslations("app.auctions.marks");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const name =
    (locale === "ar" ? auction.product?.name_ar : auction.product?.name_en) ??
    "";
  const reserve = auction.reserve?.reserve_price ?? null;

  return (
    <li className="grid gap-2 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-medium">
          {t("number", { number: String(auction.number) })} · {name}
          <span className="text-muted-foreground">
            {" "}
            · {conditions(auction.condition)}
            {auction.mark ? ` · ${tMarks(auction.mark)}` : ""}
          </span>
        </p>
        <Badge className="ms-auto" variant="secondary">
          {t(`status.${auction.status}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {auction.bid_count > 0 && auction.current_price !== null
          ? t("current", {
              amount: formatPrice(auction.current_price, locale),
              bids: formatNumber(auction.bid_count, locale),
            })
          : t("noBids", { amount: formatPrice(auction.start_price, locale) })}
        {reserve === null
          ? ""
          : ` · ${t(auction.reserve_met ? "reserveMet" : "reserveNotMet", {
              amount: formatPrice(reserve, locale),
            })}`}
      </p>
      {auction.status === "live" ? (
        <p>{t("endsAt", { time: formatDateTime(auction.ends_at, locale) })}</p>
      ) : null}
      {auction.status === "won" && auction.pay_by && auction.final_price ? (
        <p>
          {t("waitingPayment", {
            amount: formatPrice(auction.final_price, locale),
            time: formatDateTime(auction.pay_by, locale),
          })}
        </p>
      ) : null}
      {auction.mark_review === "wrong" ? (
        <p className="text-destructive">{t("markWrong")}</p>
      ) : null}
      {canManage ? (
        <AuctionRowActions auction={auction} sellerId={sellerId} />
      ) : null}
    </li>
  );
};

const AuctionList = ({
  auctions,
  canManage,
  empty,
  sellerId,
  title,
}: {
  readonly auctions: readonly ShopAuction[];
  readonly canManage: boolean;
  readonly empty: string;
  readonly sellerId: string;
  readonly title: string;
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      {auctions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {auctions.map((auction) => (
            <AuctionRow
              auction={auction}
              canManage={canManage}
              key={auction.id}
              sellerId={sellerId}
            />
          ))}
        </ul>
      )}
    </CardContent>
  </Card>
);

const AuctionsBody = () => {
  const t = useTranslations("app.company.shopAuctions");
  const { active, canManage } = useActiveOrganization();
  const shop = useSeller(active.id);
  const sellerId = shop.data?.seller.id ?? "";
  const auctions = useShopAuctions(sellerId);

  if (shop.isPending || (sellerId && auctions.isPending)) {
    return <SectionSpinner />;
  }
  if (shop.isError || auctions.isError) {
    return (
      <ErrorState
        onRetry={() => (shop.isError ? shop.refetch() : auctions.refetch())}
      />
    );
  }
  if (shop.data?.seller.status !== "approved") {
    return <p className="text-muted-foreground">{t("notApproved")}</p>;
  }

  const all = auctions.data ?? [];
  const open = all.filter((auction) =>
    ["live", "won", "unpaid"].includes(auction.status)
  );
  const ended = all.filter(
    (auction) => !["live", "won", "unpaid"].includes(auction.status)
  );
  return (
    <div className="grid max-w-3xl gap-6">
      {canManage ? <StartAuction sellerId={sellerId} /> : null}
      <AuctionList
        auctions={open}
        canManage={canManage}
        empty={t("noneOpen")}
        sellerId={sellerId}
        title={t("openTitle")}
      />
      <AuctionList
        auctions={ended}
        canManage={canManage}
        empty={t("noneEnded")}
        sellerId={sellerId}
        title={t("endedTitle")}
      />
    </div>
  );
};

/**
 * Partners → Selling → Auctions: start an auction for a copy, follow live
 * ones and wins waiting for payment, and act on unpaid ones.
 */
export const ShopAuctions = () => (
  <BusinessShell feature="selling">
    <AuctionsBody />
  </BusinessShell>
);
