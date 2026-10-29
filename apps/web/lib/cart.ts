import {
  type CartLine,
  cartTotals,
  type DeliveryChoice,
  HOUSE_SELLER_ID,
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
   * For a line in another condition (a used copy of a new product) or from
   * a shop: its copies for sale and their lowest price, from
   * `product_offers`.
   */
  offer?: { available: number; price: number } | null;
  product: CartProduct | null;
  product_id: string;
  /** "rent": a single rental (one copy from The IDEA); "sale": bought. */
  purpose: "rent" | "sale";
  quantity: number;
  /**
   * A rent line's rate (`rental_quote`): the rent for so many days and the
   * refundable deposit; null when it can't be rented anymore.
   */
  rental?: { days: number; deposit: number; price: number } | null;
  /** Who sells the line's copies: The IDEA unless it names a shop. */
  seller?: { name: string } | null;
  seller_id: string;
  variant: CartVariant | null;
  variant_id: string;
}

export interface CartLineView extends CartLine {
  /** Copies left of the line's variant. */
  available: number;
  /** False when the product was archived or can't be bought anymore. */
  buyable: boolean;
  /** A rent line's refundable deposit (0 for what's bought). */
  deposit: number;
  item: CartItem;
}

/** Whether a line is a rental rather than bought. */
export const isRentLine = (item: Pick<CartItem, "purpose">) =>
  item.purpose === "rent";

/** Whether a line asks for another condition than the product's own. */
export const isOtherCondition = (item: CartItem) =>
  item.condition !== null && item.condition !== item.product?.condition;

/** Whether a line is sold by a shop rather than The IDEA. */
export const isShopLine = (item: CartItem) =>
  Boolean(item.seller_id) && item.seller_id !== HOUSE_SELLER_ID;

/**
 * Whether a line is priced from its offer (another condition, or a shop's
 * copies) rather than the variant.
 */
export const isOtherOffer = (item: CartItem) =>
  isOtherCondition(item) || isShopLine(item);

/**
 * Prices a cart line like `create_order()` does: copies in another
 * condition or from a shop at their own price, else the variant's price.
 */
export const toCartLine = (item: CartItem): CartLineView => {
  const { product } = item;
  if (isRentLine(item)) {
    // One copy at the rental rate; whether one is free is checked at checkout.
    return {
      available: item.rental ? 1 : 0,
      buyable: product?.status === "active" && Boolean(item.rental),
      compareAtPrice: null,
      deposit: item.rental?.deposit ?? 0,
      item,
      quantity: 1,
      unitPrice: item.rental?.price ?? 0,
    };
  }
  if (isOtherOffer(item)) {
    return {
      available: item.offer?.available ?? 0,
      buyable: product?.status === "active" && Boolean(item.offer),
      compareAtPrice: null,
      deposit: 0,
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
    deposit: 0,
    item,
    quantity: item.quantity,
    unitPrice: variant ? variant.price : (product?.price ?? 0),
  };
};

/**
 * The cart as shown before checkout: priced lines, the estimated totals
 * (lines that can't be ordered are left out) and whether checkout can go
 * ahead. The checkout shows the server's quote instead.
 */
export const summarizeCart = (
  items: readonly CartItem[],
  settings: StoreSettings,
  choice?: DeliveryChoice
) => {
  const lines = items.map(toCartLine);
  const orderable = lines.filter((line) => line.buyable);
  const problems = lines.filter(
    (line) => !line.buyable || line.quantity > line.available
  );

  // Deposits come back, so they're added after delivery is priced.
  const totals = cartTotals(orderable, settings, choice);
  const deposits = orderable.reduce((sum, line) => sum + line.deposit, 0);
  return {
    canCheckout: orderable.length > 0 && problems.length === 0,
    lines,
    problems: problems.length,
    totals: {
      ...totals,
      deposits,
      subtotal: totals.subtotal + deposits,
      total: totals.total + deposits,
    },
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

/**
 * How much more to spend for free delivery from a zone's threshold (0 when
 * already free or not offered).
 */
export const freeDeliveryRemaining = (
  subtotal: number,
  freeFrom: number | null | undefined
) =>
  freeFrom === null || freeFrom === undefined || subtotal === 0
    ? 0
    : Math.max(freeFrom - subtotal, 0);

/** The cart's game night kit, priced (`useCartKitLine`). */
export interface KitLine {
  /** A unit is still free that weekend. */
  available: boolean;
  deposit: number;
  price: number;
}

/**
 * Adds the cart's kit to its summary: its price and deposit in the totals
 * (the deposit on its own row), and a problem when no unit is left.
 */
export const addKitToSummary = (
  summary: ReturnType<typeof summarizeCart>,
  kit: KitLine | null
): ReturnType<typeof summarizeCart> => {
  if (!kit) {
    return summary;
  }
  const amount = kit.price + kit.deposit;
  const problems = summary.problems + (kit.available ? 0 : 1);
  return {
    ...summary,
    canCheckout: problems === 0,
    problems,
    totals: {
      ...summary.totals,
      count: summary.totals.count + 1,
      deposits: summary.totals.deposits + kit.deposit,
      subtotal: summary.totals.subtotal + amount,
      total: summary.totals.total + amount,
    },
  };
};
