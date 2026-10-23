import { type CartLine, cartTotals, type StoreSettings } from "@repo/commerce";

/** The most of one line `cart_items` accepts (check constraint). */
export const MAX_QUANTITY = 20;

export interface CartProduct {
  compare_at_price: number | null;
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
  id: string;
  image: string | null;
  price_override: number | null;
  stock_count: number;
}

/** A `cart_items` row with its product and variant. */
export interface CartItem {
  id: string;
  product: CartProduct | null;
  product_id: string;
  quantity: number;
  variant: CartVariant | null;
  variant_id: string | null;
}

export interface CartLineView extends CartLine {
  /** Copies left: the variant's stock when there is one. */
  available: number;
  /** False when the product was archived or can't be bought anymore. */
  buyable: boolean;
  item: CartItem;
}

/** Prices a cart line like `create_order()` does (variant price first). */
export const toCartLine = (item: CartItem): CartLineView => {
  const product = item.product;
  const buyable = product?.status === "active" && product.kind === "sale";
  const available = item.variant
    ? item.variant.stock_count
    : (product?.stock_count ?? 0);

  return {
    available,
    buyable,
    compareAtPrice: product?.compare_at_price ?? null,
    item,
    quantity: item.quantity,
    unitPrice: item.variant?.price_override ?? product?.price ?? 0,
  };
};

/**
 * The cart as shown before checkout: priced lines, the totals (lines that
 * can't be ordered are left out) and whether checkout can go ahead.
 */
export const summarizeCart = (
  items: readonly CartItem[],
  settings: StoreSettings
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
    totals: cartTotals(orderable, settings),
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
