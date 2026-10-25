import {
  type CartLine,
  cartTotals,
  type DeliveryChoice,
  type Promo,
  type StoreSettings,
} from "@repo/commerce";

/** The most of one line `cart_items` accepts (check constraint). */
export const MAX_QUANTITY = 20;

type Condition = "new" | "open_box" | "refurbished" | "used";

export interface CartProduct {
  compare_at_price: number | null;
  condition: Condition;
  currency: string;
  id: string;
  images: string[];
  kind: "rental" | "sale";
  name_ar: string;
  name_en: string;
  price: number;
  slug: string;
  status: "active" | "archived" | "draft";
  stock_count: number;
}

export interface CartVariant {
  attributes: unknown;
  compare_at_price: number | null;
  id: string;
  images: string[];
  label_ar: string | null;
  label_en: string | null;
  price: number;
  stock_count: number;
}

/** A `cart_items` row with its product and variant. */
export interface CartItem {
  /** The condition asked for; null is the product's own (its main listing). */
  condition: Condition | null;
  id: string;
  /**
   * For a line in another condition (a used copy of a new product): its
   * copies for sale and their lowest price, from `product_offers`.
   */
  offer?: { available: number; price: number } | null;
  product: CartProduct | null;
  product_id: string;
  quantity: number;
  variant: CartVariant | null;
  variant_id: string;
}

export interface CartLineView extends CartLine {
  /** Copies left of the line's variant. */
  available: number;
  /** False when the product was archived or can't be bought anymore. */
  buyable: boolean;
  item: CartItem;
}

/** Whether a line asks for another condition than the product's own. */
export const isOtherCondition = (item: CartItem) =>
  item.condition !== null && item.condition !== item.product?.condition;

/**
 * Prices a cart line like `create_order()` does: copies in another
 * condition at their own price, else the variant's price.
 */
export const toCartLine = (item: CartItem): CartLineView => {
  const { product } = item;
  if (isOtherCondition(item)) {
    return {
      available: item.offer?.available ?? 0,
      buyable: product?.status === "active" && Boolean(item.offer),
      compareAtPrice: null,
      item,
      quantity: item.quantity,
      unitPrice: item.offer?.price ?? 0,
    };
  }
  const buyable = product?.status === "active" && product.kind === "sale";
  // The variant is always there; the product is the fallback if it can't
  // be read.
  const { variant } = item;
  return {
    available: variant ? variant.stock_count : (product?.stock_count ?? 0),
    buyable,
    compareAtPrice: variant
      ? variant.compare_at_price
      : (product?.compare_at_price ?? null),
    item,
    quantity: item.quantity,
    unitPrice: variant ? variant.price : (product?.price ?? 0),
  };
};

/**
 * The cart as shown before checkout: priced lines, the totals (lines that
 * can't be ordered are left out) and whether checkout can go ahead.
 */
export const summarizeCart = (
  items: readonly CartItem[],
  settings: StoreSettings,
  choice?: DeliveryChoice,
  /** Bulbs to spend (capped at what the order costs). */
  bulbs = 0,
  /** The invite or affiliate discount the member qualifies for. */
  promo: Promo = {}
) => {
  const lines = items.map(toCartLine);
  const orderable = lines.filter((line) => line.buyable);
  const problems = lines.filter(
    (line) => !line.buyable || line.quantity > line.available
  );

  return {
    canCheckout: orderable.length > 0 && problems.length === 0,
    lines,
    problems: problems.length,
    totals: cartTotals(orderable, settings, choice, bulbs, promo),
  };
};

/** Total quantity in the cart, for the navigation badge. */
export const cartCount = (items: readonly Pick<CartItem, "quantity">[]) =>
  items.reduce((sum, item) => sum + item.quantity, 0);

/** Clamps a requested quantity to what the line allows. */
export const clampQuantity = (quantity: number, available: number) =>
  Math.max(1, Math.min(quantity, MAX_QUANTITY, Math.max(available, 1)));

export type CartLineProblem = "notEnoughStock" | "outOfStock" | "unavailable";

/** Why a line can't be ordered as it is, if it can't. */
export const lineProblem = (line: CartLineView): CartLineProblem | null => {
  if (!line.buyable) {
    return "unavailable";
  }
  if (line.available <= 0) {
    return "outOfStock";
  }
  if (line.quantity > line.available) {
    return "notEnoughStock";
  }
  return null;
};

/** How much more to spend for free delivery (0 when free or not offered). */
export const freeShippingRemaining = (
  subtotal: number,
  settings: StoreSettings
) =>
  settings.freeShippingThreshold === null || subtotal === 0
    ? 0
    : Math.max(settings.freeShippingThreshold - subtotal, 0);
