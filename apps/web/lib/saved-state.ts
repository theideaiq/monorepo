import { inProjectTimeZone } from "@repo/internationalization/format";
import type { WishlistItem } from "./wishlist-queries";

/** What Saved shows about an item now. */
export type SavedState =
  | "comingSoon"
  | "inStock"
  | "outNow"
  | "priceDropped"
  | "rentableNow"
  | "unavailable";

/** Saved's filter chips. */
export type SavedFilter = "all" | "comingSoon" | "inStock" | "onSale";

export type SavedSort = "price" | "recent";

/** "Out now" lasts this many days after the release date. */
const OUT_NOW_DAYS = 14;

/** Today in Baghdad as YYYY-MM-DD. */
export const baghdadToday = (now: Date = new Date()) => {
  const day = inProjectTimeZone(now);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
};

const daysBetween = (from: string, to: string) =>
  (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
  86_400_000;

export const savedState = (
  item: Pick<WishlistItem, "product" | "saved_price">,
  today: string = baghdadToday()
): SavedState => {
  const { product } = item;
  if (product?.status !== "active") {
    return "unavailable";
  }
  const release = product.release_date;
  if (release && release > today) {
    return "comingSoon";
  }
  const inStock = product.kind === "sale" && product.stock_count > 0;
  if (inStock && release && daysBetween(release, today) <= OUT_NOW_DAYS) {
    return "outNow";
  }
  if (
    inStock &&
    item.saved_price !== null &&
    product.price < item.saved_price
  ) {
    return "priceDropped";
  }
  if (inStock) {
    return "inStock";
  }
  return product.rentable ? "rentableNow" : "unavailable";
};

const matches = (item: WishlistItem, filter: SavedFilter, today: string) => {
  const state = savedState(item, today);
  switch (filter) {
    case "comingSoon":
      return state === "comingSoon";
    case "inStock":
      return ["inStock", "outNow", "priceDropped"].includes(state);
    case "onSale":
      return (
        state === "priceDropped" ||
        (state !== "unavailable" &&
          (item.product?.compare_at_price ?? 0) > (item.product?.price ?? 0))
      );
    default:
      return true;
  }
};

/** Saved's items for a filter chip and a sort (newest or cheapest first). */
export const viewSaved = (
  items: readonly WishlistItem[],
  filter: SavedFilter,
  sort: SavedSort,
  today: string = baghdadToday()
) =>
  items
    .filter((item) => item.product && matches(item, filter, today))
    .sort((a, b) =>
      sort === "price"
        ? (a.product?.price ?? 0) - (b.product?.price ?? 0)
        : b.created_at.localeCompare(a.created_at)
    );
