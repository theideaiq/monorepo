import { describe, expect, test } from "vitest";
import { baghdadToday, savedState, viewSaved } from "@/lib/saved-state";
import type { WishlistItem } from "@/lib/wishlist-queries";

const TODAY = "2026-11-10";

const item = (
  product: Partial<NonNullable<WishlistItem["product"]>> | null,
  extra: Partial<WishlistItem> = {}
): WishlistItem => ({
  created_at: "2026-11-01T10:00:00Z",
  list_id: null,
  notify: true,
  position: 1,
  price_target: null,
  product:
    product === null
      ? null
      : ({
          compare_at_price: null,
          id: "p",
          kind: "sale",
          price: 24_750,
          release_date: null,
          rentable: false,
          status: "active",
          stock_count: 2,
          ...product,
        } as NonNullable<WishlistItem["product"]>),
  product_id: "p",
  saved_price: 24_750,
  ...extra,
});

describe("Saved states", () => {
  test("reads each state from the product", () => {
    expect(savedState(item(null), TODAY)).toBe("unavailable");
    expect(savedState(item({ status: "archived" }), TODAY)).toBe("unavailable");
    expect(savedState(item({ release_date: "2026-12-01" }), TODAY)).toBe(
      "comingSoon"
    );
    expect(savedState(item({ release_date: "2026-11-01" }), TODAY)).toBe(
      "outNow"
    );
    expect(savedState(item({ release_date: "2026-01-01" }), TODAY)).toBe(
      "inStock"
    );
    expect(savedState(item({ price: 19_750 }), TODAY)).toBe("priceDropped");
    expect(savedState(item({ rentable: true, stock_count: 0 }), TODAY)).toBe(
      "rentableNow"
    );
    expect(savedState(item({ stock_count: 0 }), TODAY)).toBe("unavailable");
  });

  test("filters and sorts", () => {
    const cheap = item(
      { id: "a", price: 9750 },
      { created_at: "2026-10-01T00:00:00Z", product_id: "a", saved_price: 9750 }
    );
    const soon = item(
      { id: "b", release_date: "2026-12-24" },
      { created_at: "2026-11-05T00:00:00Z", product_id: "b" }
    );
    const sale = item(
      { compare_at_price: 29_750, id: "c" },
      { created_at: "2026-11-03T00:00:00Z", product_id: "c" }
    );
    const all = [cheap, soon, sale];
    const ids = (list: WishlistItem[]) => list.map((entry) => entry.product_id);
    expect(ids(viewSaved(all, "all", "recent", TODAY))).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(ids(viewSaved(all, "all", "price", TODAY))).toEqual(["a", "b", "c"]);
    expect(ids(viewSaved(all, "comingSoon", "recent", TODAY))).toEqual(["b"]);
    expect(ids(viewSaved(all, "onSale", "recent", TODAY))).toEqual(["c"]);
    expect(ids(viewSaved(all, "inStock", "recent", TODAY))).toEqual(["c", "a"]);
  });

  test("today is Baghdad's date", () => {
    // 22:30 UTC is already the next day in Baghdad (UTC+3).
    expect(baghdadToday(new Date("2026-11-10T22:30:00Z"))).toBe("2026-11-11");
  });
});
