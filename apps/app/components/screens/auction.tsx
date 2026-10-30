"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  AuctionPrice,
  bidState,
  EndsIn,
  useAuctionPhoto,
} from "@/components/store/auctions";
import { productHref } from "@/components/store/product-card";
import {
  type Auction,
  bidError,
  minimumBid,
  useAddCartAuction,
  useAuction,
  useCartAuctions,
  useMyBid,
  usePlaceBid,
} from "@/lib/auctions";

type Refusal =
  | "adult"
  | "blocked"
  | "ended"
  | "failed"
  | "identity"
  | "own"
  | "phone"
  | "raise"
  | "tooLow";

/** Why a bid was refused, as a message key; the database says which. */
const REFUSALS: [prefix: string, key: Refusal][] = [
  ["Verify your phone", "phone"],
  ["Verify your identity", "identity"],
  ["Bidding is blocked", "blocked"],
  ["You need to be 18", "adult"],
  ["You can't bid on your own", "own"],
  ["This auction has ended", "ended"],
  ["Bid at least", "tooLow"],
  ["Raise your maximum", "raise"],
];

const refusalKey = (error: unknown): Refusal => {
  const message = bidError(error);
  return (
    REFUSALS.find(([prefix]) => message?.startsWith(prefix))?.[1] ?? "failed"
  );
};

/** Where to fix a refusal, when there's somewhere to go. */
const REFUSAL_LINKS: Partial<Record<Refusal, "identity" | "phone">> = {
  identity: "identity",
  phone: "phone",
};
const FIX_PATHS = {
  identity: "/verify?kind=identity",
  phone: "/pass/settings/phone",
} as const;

const Photos = ({
  auction,
  name,
}: {
  readonly auction: Auction;
  readonly name: string;
}) => {
  const t = useTranslations("app.auctions.page");
  const locale = useLocale() as Locale;
  const photo = useAuctionPhoto();
  return (
    <div className="flex flex-col gap-3">
      <CoverImage
        alt={t("photo", { name, number: formatNumber(1, locale) })}
        fit="product"
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        src={photo(auction.photos[0])}
      />
      <ul className="grid grid-cols-4 gap-3">
        {auction.photos.slice(1).map((path, index) => (
          <li key={path}>
            <CoverImage
              alt={t("photo", {
                name,
                number: formatNumber(index + 2, locale),
              })}
              fit="product"
              sizes="12vw"
              src={photo(path)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};

/** The bid form: a maximum from the next bid up; the system bids for you. */
const BidForm = ({ auction }: { readonly auction: Auction }) => {
  const t = useTranslations("app.auctions.bid");
  const locale = useLocale() as Locale;
  const place = usePlaceBid(auction.number);
  const mine = useMyBid(auction.id);
  const [amount, setAmount] = useState("");
  const inputId = useId();
  const leading = mine?.winning === true;
  const minimum = leading ? (mine?.max_amount ?? 0) + 1 : minimumBid(auction);
  const value = Number(amount);
  const valid = Number.isInteger(value) && value >= minimum;
  const refusal = place.isError ? refusalKey(place.error) : null;
  const fix = refusal ? REFUSAL_LINKS[refusal] : undefined;

  return (
    <form
      className="grid gap-2 rounded-lg border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) {
          place.mutate(
            { auctionId: auction.id, maximum: value },
            { onSuccess: () => setAmount("") }
          );
        }
      }}
    >
      <Label htmlFor={inputId}>{t("label")}</Label>
      <p className="text-muted-foreground text-xs">
        {leading
          ? t("raiseHint", {
              maximum: formatPrice(mine?.max_amount ?? 0, locale),
            })
          : t("hint", { amount: formatPrice(minimum, locale) })}
      </p>
      <div className="flex flex-wrap gap-2">
        <Input
          className="w-44"
          id={inputId}
          inputMode="numeric"
          min={minimum}
          onChange={(event) => setAmount(event.target.value)}
          type="number"
          value={amount}
        />
        <Button disabled={!valid || place.isPending} type="submit">
          {place.isPending ? t("placing") : t(leading ? "raise" : "place")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("proxy")}</p>
      {place.data ? (
        <p className="text-sm" role="status">
          {t(place.data.winning ? "winning" : "outbid", {
            amount: formatPrice(place.data.current_price, locale),
          })}
        </p>
      ) : null}
      {refusal ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`refused.${refusal}`)}{" "}
          {fix ? (
            <Link className="font-medium underline" href={FIX_PATHS[fix]}>
              {t(`fix.${fix}`)}
            </Link>
          ) : null}
        </p>
      ) : null}
    </form>
  );
};

/** What a signed-in member can do now: bid, or pay what they won. */
const Actions = ({ auction }: { readonly auction: Auction }) => {
  const t = useTranslations("app.auctions.page");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const mine = useMyBid(auction.id);
  const cart = useCartAuctions();
  const add = useAddCartAuction();
  const live = auction.status === "live";

  if (!user) {
    return live ? (
      <p className="text-sm">
        <Link
          className="font-medium text-pink-text hover:underline"
          href={{
            pathname: "/sign-in",
            query: {
              return_to: localePath(
                locale,
                `/store/auctions/${auction.number}`
              ),
            },
          }}
        >
          {t("signIn")}
        </Link>
      </p>
    ) : null;
  }
  if (live) {
    return <BidForm auction={auction} />;
  }
  const state = mine ? bidState(mine) : null;
  if ((state === "won" || state === "offered") && auction.final_price) {
    const inCart = (cart.data ?? []).some(
      (row) => row.auction_id === auction.id
    );
    return (
      <div className="grid gap-2 rounded-lg border border-brand/60 bg-brand/10 p-4 text-sm">
        <p className="font-medium">
          {t(state === "won" ? "youWon" : "offered", {
            amount: formatPrice(auction.final_price, locale),
          })}
        </p>
        {auction.pay_by ? (
          <p>{t("payBy", { time: formatDateTime(auction.pay_by, locale) })}</p>
        ) : null}
        {inCart ? (
          <Button asChild className="justify-self-start">
            <Link href="/cart">{t("goToCart")}</Link>
          </Button>
        ) : (
          <Button
            className="justify-self-start"
            disabled={add.isPending}
            onClick={() => add.mutate(auction.id)}
          >
            {t("addToCart")}
          </Button>
        )}
      </div>
    );
  }
  return null;
};

/** How it ended, for everyone. */
const Outcome = ({ auction }: { readonly auction: Auction }) => {
  const t = useTranslations("app.auctions.page");
  const locale = useLocale() as Locale;
  if (auction.status === "live") {
    return (
      <p className="text-sm">
        {t("endsAt", { time: formatDateTime(auction.ends_at, locale) })} (
        <EndsIn endsAt={auction.ends_at} />)
      </p>
    );
  }
  const sold =
    auction.status === "won" ||
    auction.status === "paid" ||
    auction.status === "unpaid";
  return (
    <p className="font-medium text-sm">
      {sold && auction.final_price
        ? t("sold", { amount: formatPrice(auction.final_price, locale) })
        : t("ended")}
    </p>
  );
};

const History = ({
  history,
}: {
  readonly history: readonly {
    alias: number;
    amount: number;
    created_at: string;
    id: number;
  }[];
}) => {
  const t = useTranslations("app.auctions.page");
  const locale = useLocale() as Locale;
  return (
    <section aria-labelledby="bid-history" className="grid gap-2">
      <h2 className="font-semibold text-lg" id="bid-history">
        {t("history")}
      </h2>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noBids")}</p>
      ) : (
        <ol className="divide-y rounded-md border text-sm">
          {history.map((event) => (
            <li className="flex justify-between gap-3 p-3" key={event.id}>
              <span>
                {t("bidder", { number: formatNumber(event.alias, locale) })}
              </span>
              <span className="font-mono tabular-nums">
                {formatPrice(event.amount, locale)}
              </span>
              <span className="text-muted-foreground">
                {formatDateTime(event.created_at, locale)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};

/**
 * Store → an auction: the seller's photos of the copy, its condition, the
 * price and time left, bidding by maximum, and the history by alias. A
 * winner pays through the cart within 48 hours.
 */
export const AuctionScreen = ({ number }: { readonly number: number }) => {
  const t = useTranslations("app.auctions");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const query = useAuction(number);

  if (query.isPending) {
    return <SectionSpinner />;
  }
  if (query.isError) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  if (!query.data || query.data.auction.status === "cancelled") {
    return <p className="text-muted-foreground">{t("page.missing")}</p>;
  }
  const { auction, history } = query.data;
  const name = auction.product
    ? localized(auction.product, "name", locale)
    : "";

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <Photos auction={auction} name={name} />
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{t("label")}</Badge>
            <Badge variant="outline">{conditions(auction.condition)}</Badge>
            {auction.mark ? (
              <Badge variant="outline">{t(`marks.${auction.mark}`)}</Badge>
            ) : null}
          </div>
          <h1 className="font-bold text-3xl tracking-tight">{name}</h1>
          {auction.seller && !auction.seller.is_house ? (
            <p className="text-muted-foreground text-sm">
              {t("page.soldBy", { seller: auction.seller.name })}
            </p>
          ) : null}
          <p className="text-xl">
            <AuctionPrice auction={auction} />
          </p>
          {auction.has_reserve && auction.status === "live" ? (
            <p className="text-muted-foreground text-sm">
              {t(
                auction.reserve_met ? "page.reserveMet" : "page.reserveNotMet"
              )}
            </p>
          ) : null}
          <Outcome auction={auction} />
        </div>
        <Actions auction={auction} />
        <section aria-labelledby="auction-condition" className="grid gap-2">
          <h2 className="font-semibold text-lg" id="auction-condition">
            {t("page.condition")}
          </h2>
          <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
            {auction.condition_note}
          </p>
        </section>
        {auction.product ? (
          <Link
            className="text-pink-text text-sm hover:underline"
            href={productHref(auction.product.slug)}
          >
            {t("page.product")}
          </Link>
        ) : null}
        <History history={history} />
      </div>
    </div>
  );
};

/** Back to Store → Auctions. */
export const BackToAuctions = () => {
  const t = useTranslations("app.auctions.page");
  return (
    <Link
      className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
      href="/store/auctions"
    >
      <MoveLeft className="size-4 rtl:rotate-180" />
      {t("back")}
    </Link>
  );
};
