"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import {
  formatDateTime,
  formatNumber,
  formatRelativeTime,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { GavelIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { CoverImage } from "@/components/cover-image";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type Auction,
  type MyBid,
  useLiveAuctions,
  useMyBids,
  useProductAuctions,
} from "@/lib/auctions";

/** Public URL of an auction photo (the public `auction-photos` bucket). */
export const useAuctionPhoto = () => {
  const { supabase } = useAuth();
  return (path: string | undefined) =>
    path
      ? supabase.storage.from("auction-photos").getPublicUrl(path).data
          .publicUrl
      : null;
};

/**
 * "in 2 days", "in 5 minutes": rendered after mounting (the server's clock
 * isn't the visitor's) and refreshed every half minute.
 */
export const EndsIn = ({ endsAt }: { readonly endsAt: string }) => {
  const locale = useLocale() as Locale;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (now === null) {
    return <time dateTime={endsAt}>{formatDateTime(endsAt, locale)}</time>;
  }
  return (
    <time dateTime={endsAt} title={formatDateTime(endsAt, locale)}>
      {formatRelativeTime(endsAt, locale, now)}
    </time>
  );
};

/** "Current bid 85,000 IQD · 4 bids", or the start price before any bid. */
export const AuctionPrice = ({
  auction,
}: {
  readonly auction: Pick<
    Auction,
    "bid_count" | "current_price" | "start_price"
  >;
}) => {
  const t = useTranslations("app.auctions");
  const locale = useLocale() as Locale;
  return auction.bid_count > 0 && auction.current_price !== null ? (
    <span>
      {t("currentBid", { amount: formatPrice(auction.current_price, locale) })}
      <span className="text-muted-foreground">
        {" · "}
        {t("bids", { count: formatNumber(auction.bid_count, locale) })}
      </span>
    </span>
  ) : (
    <span>
      {t("startsAt", { amount: formatPrice(auction.start_price, locale) })}
    </span>
  );
};

/** One live auction in a grid: its first photo, name, price and time left. */
export const AuctionCard = ({ auction }: { readonly auction: Auction }) => {
  const t = useTranslations("app.auctions");
  const conditions = useTranslations("store.condition");
  const locale = useLocale() as Locale;
  const photo = useAuctionPhoto();
  const name = auction.product
    ? localized(auction.product, "name", locale)
    : "";
  return (
    <Link
      className="grid content-start gap-2"
      href={`/store/auctions/${auction.number}`}
    >
      <CoverImage
        alt={name}
        fit="product"
        sizes="(min-width: 1024px) 25vw, 50vw"
        src={photo(auction.photos[0])}
      />
      <span className="font-medium text-sm">{name}</span>
      <span className="text-muted-foreground text-xs">
        {conditions(auction.condition)}
        {auction.mark ? ` · ${t(`marks.${auction.mark}`)}` : ""}
      </span>
      <span className="text-sm">
        <AuctionPrice auction={auction} />
      </span>
      <span className="text-muted-foreground text-xs">
        {t("ends")} <EndsIn endsAt={auction.ends_at} />
      </span>
    </Link>
  );
};

/**
 * The product page's live auctions, next to its normal offers: "Auction ·
 * ends in 2 days · current bid 85,000 IQD".
 */
export const ProductAuctions = ({
  productId,
}: {
  readonly productId: string;
}) => {
  const t = useTranslations("app.auctions");
  const conditions = useTranslations("store.condition");
  const auctions = useProductAuctions(productId).data ?? [];
  if (auctions.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="product-auctions" className="grid gap-2">
      <h2 className="font-semibold text-sm" id="product-auctions">
        {t("onProduct")}
      </h2>
      <ul className="grid gap-2">
        {auctions.map((auction) => (
          <li key={auction.id}>
            <Link
              className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border p-3 text-sm hover:bg-muted"
              href={`/store/auctions/${auction.number}`}
            >
              <GavelIcon aria-hidden="true" className="size-4 text-pink-text" />
              <span className="font-medium">{t("label")}</span>
              <span className="text-muted-foreground">
                · {conditions(auction.condition)} · {t("ends")}{" "}
                <EndsIn endsAt={auction.ends_at} /> ·
              </span>
              <AuctionPrice auction={auction} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

type BidState =
  | "lost"
  | "offered"
  | "outbid"
  | "paid"
  | "unpaid"
  | "winning"
  | "won";

/** Where a member's bid stands. */
export const bidState = (bid: MyBid): BidState => {
  const status = bid.auction?.status;
  if (status === "live") {
    return bid.winning ? "winning" : "outbid";
  }
  if (bid.outcome === "unpaid") {
    return "unpaid";
  }
  if (bid.outcome === "won" || bid.outcome === "second_chance") {
    if (status === "paid") {
      return "paid";
    }
    if (status === "won") {
      return bid.outcome === "won" ? "won" : "offered";
    }
  }
  return "lost";
};

const BidRow = ({ bid }: { readonly bid: MyBid }) => {
  const t = useTranslations("app.auctions.mine");
  const locale = useLocale() as Locale;
  const state = bidState(bid);
  const { auction } = bid;
  if (!auction) {
    return null;
  }
  const name = auction.product
    ? localized(auction.product, "name", locale)
    : "";
  const toPay = state === "won" || state === "offered";
  return (
    <li className="grid gap-1 py-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="font-medium hover:underline"
          href={`/store/auctions/${auction.number}`}
        >
          {name}
        </Link>
        <Badge className="ms-auto" variant="secondary">
          {t(`state.${state}`)}
        </Badge>
      </div>
      <p className="text-muted-foreground">
        {state === "winning" || state === "outbid"
          ? t("live", {
              current: formatPrice(auction.current_price ?? 0, locale),
              maximum: formatPrice(bid.max_amount, locale),
            })
          : t("yourBid", { amount: formatPrice(bid.amount, locale) })}
      </p>
      {toPay && auction.final_price !== null && auction.pay_by ? (
        <p>
          {t("payBy", {
            amount: formatPrice(auction.final_price, locale),
            time: formatDateTime(auction.pay_by, locale),
          })}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/cart"
          >
            {t("viewCart")}
          </Link>
        </p>
      ) : null}
    </li>
  );
};

/** Pass → Saved → Bids: the member's auctions, those to act on first. */
export const MyBids = () => {
  const t = useTranslations("app.auctions.mine");
  const bids = useMyBids().data ?? [];
  if (bids.length === 0) {
    return null;
  }
  const first = new Set<BidState>(["offered", "outbid", "winning", "won"]);
  const sorted = [
    ...bids.filter((bid) => first.has(bidState(bid))),
    ...bids.filter((bid) => !first.has(bidState(bid))),
  ];
  return (
    <section className="grid gap-2" id="bids">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      <p className="text-muted-foreground text-sm">{t("description")}</p>
      <ul className="divide-y">
        {sorted.map((bid) => (
          <BidRow bid={bid} key={bid.auction_id} />
        ))}
      </ul>
    </section>
  );
};

/** Store → Auctions: every live auction, ending soonest first. */
export const LiveAuctions = () => {
  const t = useTranslations("app.auctions");
  const auctions = useLiveAuctions();
  if (auctions.isPending) {
    return <SectionSpinner />;
  }
  if (auctions.isError) {
    return <ErrorState onRetry={() => auctions.refetch()} />;
  }
  if ((auctions.data ?? []).length === 0) {
    return <p className="text-muted-foreground">{t("empty")}</p>;
  }
  return (
    <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {(auctions.data ?? []).map((auction) => (
        <li key={auction.id}>
          <AuctionCard auction={auction} />
        </li>
      ))}
    </ul>
  );
};
