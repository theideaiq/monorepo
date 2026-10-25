/**
 * Store helpers shared by the website, the app, the back office and the
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

/** A price in IQD for display ("٧٢٠٬٠٠٠ د.ع." / "IQD 720,000"). */
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

/** The condition customers see, as a condition bulb (brand v1.0). */
export type CustomerCondition = "like-new" | "new" | "used";

const CUSTOMER_CONDITIONS: Record<ProductCondition, CustomerCondition> = {
  new: "new",
  open_box: "like-new",
  refurbished: "like-new",
  used: "used",
};

/**
 * Maps a product's stored condition to the three conditions customers see:
 * new, like new (open box or refurbished) or used.
 */
export const customerCondition = (condition: ProductCondition) =>
  CUSTOMER_CONDITIONS[condition];

/**
 * Anything for sale that isn't new shows its condition bulb. Rentals don't:
 * the member borrows a copy and gives it back, so its grade isn't theirs to
 * weigh.
 */
export const showsConditionBulb = (product: {
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
  freeShippingThreshold: number | null;
  /** The fee the cart shows before a delivery zone is chosen. */
  shippingFee: number;
}

/** How an order reaches the customer (`orders.fulfilment`). */
export type Fulfilment = "delivery" | "pickup";

/** How an order is paid (`orders.payment_method`). */
export type PaymentMethod = "cash_on_delivery" | "online";

/** Pickup or delivery, and the chosen zone's fee for delivery. */
export interface DeliveryChoice {
  /**
   * The member's tier perk: the subtotal from which delivery is free (0 for
   * always), or null without one.
   */
  freeDeliveryFrom?: number | null;
  fulfilment: Fulfilment;
  /** The delivery zone's fee; the store's default fee when none is chosen. */
  zoneFee?: number | null;
}

/** 1 Bulb takes 100 IQD off an order. */
export const BULB_VALUE_IQD = 100;

/** A friend's invite: 10% off the first order, at most 15,000 IQD. */
export const INVITE_DISCOUNT_RATE = 0.1;
export const INVITE_DISCOUNT_CAP = 15_000;

/** The invite discount on a subtotal, mirroring `create_order()`. */
export const inviteDiscount = (subtotal: number) =>
  Math.min(Math.floor(subtotal * INVITE_DISCOUNT_RATE), INVITE_DISCOUNT_CAP);

/** An affiliate's link or code: 5% off, no cap. */
export const AFFILIATE_DISCOUNT_RATE = 0.05;

/** What takes money off an order (`orders.discount_source`). */
export type DiscountSource = "affiliate" | "invite";

/** The discounts a member's next order qualifies for. */
export interface Promo {
  /** An affiliate's link or code in the past 30 days. */
  affiliate?: boolean;
  /** The member's first order through a friend's invite. */
  invited?: boolean;
}

/**
 * The order's one discount, mirroring `create_order()`: the larger of the
 * invite and the affiliate's 5%, the invite on a tie.
 */
export const orderDiscount = (
  subtotal: number,
  promo: Promo = {}
): { discount: number; discountSource: DiscountSource | null } => {
  const invite = promo.invited ? inviteDiscount(subtotal) : 0;
  const affiliate = promo.affiliate
    ? Math.floor(subtotal * AFFILIATE_DISCOUNT_RATE)
    : 0;
  if (affiliate > invite) {
    return { discount: affiliate, discountSource: "affiliate" };
  }
  return { discount: invite, discountSource: invite > 0 ? "invite" : null };
};

/**
 * The delivery fee, mirroring `create_order()`: pickup is free; delivery
 * costs the zone's fee unless the subtotal reaches the free-delivery
 * threshold or the member's tier delivers free.
 */
export const deliveryFee = (
  subtotal: number,
  settings: StoreSettings,
  choice?: DeliveryChoice
) => {
  if (subtotal === 0 || choice?.fulfilment === "pickup") {
    return 0;
  }
  if (
    settings.freeShippingThreshold !== null &&
    subtotal >= settings.freeShippingThreshold
  ) {
    return 0;
  }
  if (
    choice?.freeDeliveryFrom !== null &&
    choice?.freeDeliveryFrom !== undefined &&
    subtotal >= choice.freeDeliveryFrom
  ) {
    return 0;
  }
  return choice?.zoneFee ?? settings.shippingFee;
};

/**
 * The totals the customer will be charged, mirroring `create_order()` in the
 * database (which is authoritative: it re-prices every line from the catalog
 * and takes the fee from the delivery zone).
 */
export const cartTotals = (
  lines: CartLine[],
  settings: StoreSettings,
  choice?: DeliveryChoice,
  /** Bulbs the member wants to spend (capped at what the order costs). */
  bulbs = 0,
  /** The invite or affiliate discount the member qualifies for. */
  promo: Promo = {}
) => {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const shippingFee = deliveryFee(subtotal, settings, choice);
  const { discount, discountSource } = orderDiscount(subtotal, promo);
  const bulbsUsed = Math.max(
    0,
    Math.min(
      Math.floor(bulbs),
      Math.floor((subtotal + shippingFee - discount) / BULB_VALUE_IQD)
    )
  );
  const bulbsDiscount = bulbsUsed * BULB_VALUE_IQD;
  return {
    bulbsDiscount,
    bulbsUsed,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    discount,
    discountSource,
    shippingFee,
    subtotal,
    total: subtotal + shippingFee - discount - bulbsDiscount,
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
 * cash is collected on delivery or at pickup.
 */
export const cashOrderSteps = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;
