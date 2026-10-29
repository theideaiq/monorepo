import { Constants } from "@repo/database";
import { z } from "zod";
import { isCatalogImage } from "./catalog-images";
import {
  checkbox,
  int,
  lines,
  optionalDate,
  optionalDecimal,
  optionalInt,
  optionalText,
  optionalUuid,
  slug,
  text,
} from "./forms";

const { Enums } = Constants.public;

/**
 * Product images (`images[]`): storage paths or links to the allowed
 * cover-art hosts, empty entries dropped.
 */
const catalogImages = (max: number) =>
  z
    .array(z.string())
    .optional()
    .transform((values) => (values ?? []).map((v) => v.trim()).filter(Boolean))
    .pipe(z.array(z.string().refine(isCatalogImage)).max(max));

/** PEGI age ratings; empty for none. */
const AGE_RATINGS = [3, 7, 12, 16, 18] as const;

export const productSchema = z.object({
  ageRating: optionalInt(3, 18).refine(
    (value) =>
      value === null || (AGE_RATINGS as readonly number[]).includes(value)
  ),
  categoryId: optionalUuid,
  condition: z.enum(Enums.product_condition),
  descriptionAr: optionalText(10_000),
  descriptionEn: optionalText(10_000),
  detailKey: z.array(z.string()).optional(),
  detailValue: z.array(z.string()).optional(),
  featured: checkbox,
  id: optionalUuid,
  images: catalogImages(12),
  kind: z.enum(Enums.product_kind),
  nameAr: text(200),
  nameEn: text(200),
  price: int(0),
  releaseDate: optionalDate,
  /** Minimum The IDEA Plus plan tier for rental items; null = any plan. */
  rentalTier: optionalInt(1, 10),
  seller: text(120),
  slug,
  status: z.enum(Enums.product_status),
  stock: int(0, 1_000_000),
  verified: checkbox,
});

export const planSchema = z
  .object({
    active: checkbox,
    amount: int(0),
    audience: z.enum(["business", "plus"]),
    billingInterval: z.enum(Enums.billing_interval),
    /** The Plus plan's Bulbs rate in percent; empty for the store's. */
    bulbRate: optionalDecimal(0).refine((rate) => rate === null || rate <= 50),
    description: optionalText(500),
    featuresAr: lines(20, 200),
    featuresEn: lines(20, 200),
    /** Free delivery in zones that offer it to Plus plans. */
    freeDelivery: checkbox,
    id: slug.max(64),
    isNew: checkbox,
    name: text(120),
    nameAr: optionalText(120),
    position: int(0, 10_000),
    rentalSlots: optionalInt(1, 50),
    /** The IDEA Plus plan level; rental items can require a minimum tier. */
    tier: optionalInt(1, 10),
  })
  .refine((plan) => plan.audience !== "plus" || plan.rentalSlots !== null, {
    path: ["rentalSlots"],
  })
  .refine((plan) => plan.audience !== "plus" || plan.tier !== null, {
    path: ["tier"],
  })
  .transform((plan) => ({
    ...plan,
    bulbRate: plan.audience === "plus" ? plan.bulbRate : null,
    freeDelivery: plan.audience === "plus" && plan.freeDelivery,
    rentalSlots: plan.audience === "plus" ? plan.rentalSlots : null,
    tier: plan.audience === "plus" ? plan.tier : null,
  }));

/**
 * Rental-tier choices for the product form: one per Plus tier, labelled
 * with the names of the plans at that tier (e.g. "Gold monthly / Gold
 * yearly"), lowest first. Inactive plans still count, so items keep the
 * tier they were given.
 */
export const tierOptions = (
  plans: { audience: string; name: string; tier: number | null }[]
) => {
  const byTier = new Map<number, string[]>();
  for (const plan of plans) {
    if (plan.audience !== "plus" || plan.tier === null) {
      continue;
    }
    const names = byTier.get(plan.tier) ?? [];
    if (!names.includes(plan.name)) {
      names.push(plan.name);
    }
    byTier.set(plan.tier, names);
  }
  return [...byTier.entries()]
    .sort(([a], [b]) => a - b)
    .map(([tier, names]) => ({ names: names.join(" / "), tier }));
};

/**
 * The tier choices plus the product's current tier when no plan has it any
 * more (so saving the form doesn't silently change it).
 */
export const withCurrentTier = (
  tiers: { names: string; tier: number }[],
  current: number | null,
  unknownLabel: string
) =>
  current === null || tiers.some((item) => item.tier === current)
    ? tiers
    : [...tiers, { names: unknownLabel, tier: current }];
