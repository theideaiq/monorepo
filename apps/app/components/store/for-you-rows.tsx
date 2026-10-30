"use client";

import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { useLocale, useTranslations } from "next-intl";
import { Rail } from "@/components/shop/rail";
import { useLiveAuctions } from "@/lib/auctions";
import { useCategories, useProducts } from "@/lib/store-queries";
import { useWishlist } from "@/lib/wishlist-queries";
import { AuctionCard } from "./auctions";
import { CoverCard } from "./cover-card";

const ROW = 8;

/** Live auctions, ending soonest first; nothing when none is live. */
export const LiveAuctionsRow = () => {
  const t = useTranslations("web.store.shelf");
  const tUi = useTranslations("web.ui");
  const auctions = useLiveAuctions().data ?? [];
  if (auctions.length === 0) {
    return null;
  }
  return (
    <Rail
      action={{ href: "/store/auctions", label: tUi("viewAll") }}
      title={t("liveAuctions")}
    >
      {auctions.slice(0, ROW).map((auction) => (
        <AuctionCard auction={auction} key={auction.id} />
      ))}
    </Rail>
  );
};

/**
 * Signed in: "Because you saved …" (more from the category of the latest
 * thing saved) and "Back in stock" (saved with Tell me, in stock now).
 */
export const SavedRows = () => {
  const t = useTranslations("web.store.shelf");
  const locale = useLocale();
  const { user } = useAuth();
  const saved = useWishlist().data ?? [];
  const categories = useCategories("sale").data ?? [];
  const [latest] = [...saved]
    .filter((item) => item.product?.category_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const category = categories.find(
    (row) => row.id === latest?.product?.category_id
  );
  const related = useProducts({
    category: category?.slug ?? "",
    limit: ROW + saved.length,
  });
  if (!user) {
    return null;
  }
  const savedIds = new Set(saved.map((item) => item.product_id));
  const more = category
    ? (related.data ?? [])
        .filter((product) => !savedIds.has(product.id))
        .slice(0, ROW)
    : [];
  const back = saved.flatMap((item) =>
    item.notify && item.product && item.product.stock_count > 0
      ? [item.product]
      : []
  );
  return (
    <>
      {latest?.product && more.length > 0 ? (
        <Rail
          title={t("becauseSaved", {
            name: localized(latest.product, "name", locale),
          })}
        >
          {more.map((product) => (
            <CoverCard key={product.id} product={product} />
          ))}
        </Rail>
      ) : null}
      {back.length > 0 ? (
        <Rail
          action={{ href: "/pass/saved", label: t("seeSaved") }}
          title={t("backInStock")}
        >
          {back.slice(0, ROW).map((product) => (
            <CoverCard key={product.id} product={product} />
          ))}
        </Rail>
      ) : null}
    </>
  );
};
