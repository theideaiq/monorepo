/**
 * Store helpers shared by the website, the app, Staff and the
 * Telegram bot: bilingual fields, prices, Iraqi governorates and the cart
 * total preview. Safe for client and server code.
 */
import { formatCurrency } from "@repo/internationalization/format";

export type ContentLocale = "ar" | "en";

const contentLocale = (locale: string): ContentLocale =>
  locale === "en" ? "en" : "ar";

/**
 * Picks the column for the reader's language from a bilingual row
 * (`name_ar` / `name_en`), falling back to the other language when empty.
 */
export const localized = <
  Field extends string,
  Row extends Partial<Record<`${Field}_ar` | `${Field}_en`, string | null>>,
>(
  row: Row,
  field: Field,
  locale: string
): string => {
  const primary = contentLocale(locale);
  const fallback = primary === "ar" ? "en" : "ar";
  return (row[`${field}_${primary}` as keyof Row & string] ||
    row[`${field}_${fallback}` as keyof Row & string] ||
    "") as string;
};

interface CategoryRow {
  readonly id: string;
  readonly name_ar: string;
  readonly name_en: string;
  readonly parent_id?: string | null;
}

/**
 * Categories for a picker, in order: each top-level category (in the given
 * order) followed by its subcategories, labelled "Books › Comics & manga".
 */
export const categoryOptions = (
  categories: readonly CategoryRow[],
  locale: string
): { id: string; label: string }[] =>
  categories
    .filter((category) => !category.parent_id)
    .flatMap((parent) => [
      { id: parent.id, label: localized(parent, "name", locale) },
      ...categories
        .filter((category) => category.parent_id === parent.id)
        .map((child) => ({
          id: child.id,
          label: `${localized(parent, "name", locale)} › ${localized(child, "name", locale)}`,
        })),
    ]);

/** A price in IQD for display ("720,000 د.ع." / "720,000 IQD"). */
export const formatPrice = (amount: number, locale: string) =>
  formatCurrency(amount, contentLocale(locale));

/** Percentage saved against the compare-at price, rounded down. */
export const discountPercent = (
  price: number,
  compareAtPrice: number | null | undefined
) =>
  compareAtPrice && compareAtPrice > price
    ? Math.floor(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

type ProductCondition = "new" | "open_box" | "refurbished" | "used";

/**
 * Anything for sale that isn't new shows its condition (Open box,
 * Refurbished or Used). Rentals don't: the member borrows a copy and gives
 * it back, so its grade isn't theirs to weigh.
 */
export const showsCondition = (product: {
  readonly condition: ProductCondition;
  readonly kind: string;
}) => product.kind !== "rental" && product.condition !== "new";

/** Variant attributes as "Color: Black · Storage: 1 TB". */
export const describeAttributes = (attributes: unknown) =>
  attributes && typeof attributes === "object" && !Array.isArray(attributes)
    ? Object.entries(attributes as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${String(value)}`)
        .join(" · ")
    : "";

/**
 * A plan's name in the reader's language: `name_ar` on Arabic pages when
 * it's set, else `name` (English).
 */
export const planName = (
  plan: { readonly name: string; readonly name_ar?: string | null },
  locale: string
) => (locale === "ar" && plan.name_ar ? plan.name_ar : plan.name);

/**
 * A variant's name for customers: its label in their language, else its
 * attributes, else nothing (a product's only, unlabelled variant).
 */
export const variantName = (
  variant: {
    readonly attributes?: unknown;
    readonly label_ar?: string | null;
    readonly label_en?: string | null;
  },
  locale: string
) =>
  localized(
    { label_ar: variant.label_ar ?? null, label_en: variant.label_en ?? null },
    "label",
    locale
  ) || describeAttributes(variant.attributes);

/**
 * A variant's key in a product page address (`?variant=vinyl`): its English
 * label (else SKU, else id) in lower case with dashes.
 */
export const variantSlug = (variant: {
  readonly id: string;
  readonly label_en?: string | null;
  readonly sku?: string | null;
}) =>
  (variant.label_en || variant.sku || variant.id)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || variant.id;

interface VariantPrice {
  readonly active?: boolean;
  readonly position?: number;
  readonly price: number;
}

/** The variants customers can choose (hidden ones left out), in order. */
export const liveVariants = <Variant extends VariantPrice>(
  variants: readonly Variant[] | null | undefined
) =>
  (variants ?? [])
    .filter((variant) => variant.active !== false)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

/**
 * Whether a product's live variants cost different amounts, so its price
 * reads "From …" (the product's price is the cheapest).
 */
export const hasPriceRange = (
  variants: readonly VariantPrice[] | null | undefined
) => new Set(liveVariants(variants).map((variant) => variant.price)).size > 1;

/** Iraq's governorates, for delivery addresses. */
export const governorates = [
  { ar: "بغداد", en: "Baghdad", id: "baghdad" },
  { ar: "البصرة", en: "Basra", id: "basra" },
  { ar: "نينوى", en: "Nineveh", id: "nineveh" },
  { ar: "أربيل", en: "Erbil", id: "erbil" },
  { ar: "السليمانية", en: "Sulaymaniyah", id: "sulaymaniyah" },
  { ar: "دهوك", en: "Duhok", id: "duhok" },
  { ar: "حلبجة", en: "Halabja", id: "halabja" },
  { ar: "كركوك", en: "Kirkuk", id: "kirkuk" },
  { ar: "الأنبار", en: "Anbar", id: "anbar" },
  { ar: "بابل", en: "Babylon", id: "babylon" },
  { ar: "كربلاء", en: "Karbala", id: "karbala" },
  { ar: "النجف", en: "Najaf", id: "najaf" },
  { ar: "واسط", en: "Wasit", id: "wasit" },
  { ar: "ديالى", en: "Diyala", id: "diyala" },
  { ar: "صلاح الدين", en: "Saladin", id: "saladin" },
  { ar: "ذي قار", en: "Dhi Qar", id: "dhi-qar" },
  { ar: "ميسان", en: "Maysan", id: "maysan" },
  { ar: "المثنى", en: "Muthanna", id: "muthanna" },
  { ar: "القادسية", en: "Al-Qadisiyah", id: "qadisiyah" },
] as const;

export type GovernorateId = (typeof governorates)[number]["id"];

export interface CartLine {
  compareAtPrice?: number | null;
  quantity: number;
  unitPrice: number;
}

export interface StoreSettings {
  /** The fee the cart shows before a delivery zone is chosen. */
  shippingFee: number;
}

/**
 * How an order reached the customer (`orders.fulfilment`): every order is
 * delivered now; "pickup" remains on past orders.
 */
export type Fulfilment = "delivery" | "pickup";

/** How an order is paid (`orders.payment_method`). */
export type PaymentMethod = "cash_on_delivery" | "online";

/** The chosen zone's rules for delivery. */
export interface DeliveryChoice {
  /** The zone's subtotal from which delivery is free for everyone. */
  freeFrom?: number | null;
  /** The member's plan delivers free to this zone. */
  planFree?: boolean;
  /** The delivery zone's fee; the store's default fee when none is chosen. */
  zoneFee?: number | null;
}

/** 1 Bulb takes 1 IQD off an order. */
export const BULB_VALUE_IQD = 1;

/** Bulbs are spent in steps of 250 (`price_checkout()`). */
export const BULB_STEP = 250;

/** The fewest Bulbs an order takes; fewer spend nothing. */
export const BULB_MIN_SPEND = 1000;

/** The Bulbs a price earns at a rate (%), in whole Bulbs as delivered orders earn them. */
export const bulbsToEarn = (price: number, rate: number) =>
  Math.round((price * rate) / 100);

/** The Bulbs an order takes from what the member asks: down to the step, none under the minimum. */
export const bulbsToSpend = (wanted: number, cost: number) => {
  const bulbs = Math.floor(Math.min(wanted, cost) / BULB_STEP) * BULB_STEP;
  return bulbs < BULB_MIN_SPEND ? 0 : bulbs;
};

/** The IDEA as a seller: it holds its own stock and sells next to shops. */
export const HOUSE_SELLER_ID = "00000000-0000-4000-8000-000000000001";

/** A friend's invite: 10% off the first order, at most 15,000 IQD. */
export const INVITE_DISCOUNT_CAP = 15_000;

/** What takes money off an order (`orders.discount_source`). */
export type DiscountSource = "coupon" | "invite";

/**
 * The delivery fee, mirroring `price_checkout()`: the zone's fee unless the subtotal reaches the zone's free-delivery
 * threshold or the member's plan delivers free there.
 */
export const deliveryFee = (
  subtotal: number,
  settings: StoreSettings,
  choice?: DeliveryChoice
) => {
  if (subtotal === 0) {
    return 0;
  }
  const freeFrom = choice?.freeFrom;
  if (
    (freeFrom !== null && freeFrom !== undefined && subtotal >= freeFrom) ||
    choice?.planFree
  ) {
    return 0;
  }
  return choice?.zoneFee ?? settings.shippingFee;
};

/**
 * The cart's estimate: the lines and delivery. The checkout shows the
 * server's quote (`checkout_quote()`), which adds the discount, the Bulbs
 * spent and the giveaway cap.
 */
export const cartTotals = (
  lines: CartLine[],
  settings: StoreSettings,
  choice?: DeliveryChoice
) => {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const shippingFee = deliveryFee(subtotal, settings, choice);
  return {
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    shippingFee,
    subtotal,
    total: subtotal + shippingFee,
  };
};

/** Why delivery is free on a quote: the zone's threshold or the plan. */
export type FreeDeliveryReason = "plan" | "threshold";

/** The checkout priced by the server (`checkout_quote()`), in IQD. */
export interface CheckoutQuote {
  /** The Bulbs rate the order earns at, in percent. */
  bulbRate: number;
  bulbsDiscount: number;
  /** Cashback the order will earn once delivered (after the cap). */
  bulbsToEarn: number;
  bulbsUsed: number;
  /** The cart's coupon code, when one is applied and still valid. */
  couponCode: string | null;
  /** Delivery the order doesn't pay (the zone's fee when it's free). */
  deliveryWaived: number;
  /** Refundable deposits of the cart's rentals (in the subtotal). */
  deposits: number;
  discount: number;
  discountSource: DiscountSource | null;
  freeDelivery: FreeDeliveryReason | null;
  /** The zone's free-delivery threshold, for "add X for free delivery". */
  freeFrom: number | null;
  /** The rent of the cart's rentals (in the subtotal). */
  rent: number;
  shippingFee: number;
  /** What's bought, the rent and the deposits. */
  subtotal: number;
  total: number;
  zoneId: string | null;
}

const toNumber = (value: unknown) =>
  typeof value === "number" ? value : Number(value ?? 0) || 0;

/** Reads `checkout_quote()`'s JSON. */
export const toCheckoutQuote = (json: unknown): CheckoutQuote => {
  const row = (json ?? {}) as Record<string, unknown>;
  const source = row.discount_source;
  const free = row.free_delivery;
  return {
    bulbRate: toNumber(row.bulb_rate),
    bulbsDiscount: toNumber(row.bulbs_discount),
    bulbsToEarn: toNumber(row.bulbs_to_earn),
    bulbsUsed: toNumber(row.bulbs_used),
    couponCode: typeof row.coupon_code === "string" ? row.coupon_code : null,
    deliveryWaived: toNumber(row.delivery_waived),
    deposits: toNumber(row.deposits),
    discount: toNumber(row.discount),
    discountSource: source === "invite" || source === "coupon" ? source : null,
    freeDelivery: free === "plan" || free === "threshold" ? free : null,
    freeFrom:
      row.free_from === null || row.free_from === undefined
        ? null
        : toNumber(row.free_from),
    rent: toNumber(row.rent),
    shippingFee: toNumber(row.shipping_fee),
    subtotal: toNumber(row.subtotal),
    total: toNumber(row.total),
    zoneId: typeof row.zone_id === "string" ? row.zone_id : null,
  };
};

/** The order statuses customers see, in fulfilment order. */
export const orderSteps = [
  "paid",
  "processing",
  "shipped",
  "delivered",
] as const;

/**
 * The steps of an order paid in cash: confirmed when placed, paid once the
 * cash is collected on delivery.
 */
export const cashOrderSteps = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;
