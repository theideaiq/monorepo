/** A Plus plan's name and tier (`plans.tier`, higher plans rent more). */
export interface PlanTier {
  name: string;
  tier: number | null;
}

const byTier = (plans: PlanTier[]) =>
  plans
    .filter((plan): plan is PlanTier & { tier: number } => plan.tier !== null)
    .sort((a, b) => a.tier - b.tier);

/**
 * The plan a rental item needs (`products.rental_tier`): the lowest plan
 * whose tier reaches it. Null when every plan can rent the item (no tier, or
 * a tier the entry plan already covers) or when no current plan reaches it.
 */
export const requiredPlan = <T extends PlanTier>(
  plans: T[],
  rentalTier: number | null | undefined
): T | null => {
  if (rentalTier === null || rentalTier === undefined) {
    return null;
  }
  const [entry, ...higher] = byTier(plans);
  if (!entry || rentalTier <= entry.tier) {
    return null;
  }
  const plan: PlanTier | undefined = higher.find(
    (candidate) => candidate.tier >= rentalTier
  );
  return (plan as T | undefined) ?? null;
};

/** The plans for one person, without the Duo plans (`plans.duo`). */
export const soloPlans = <T extends { duo?: boolean | null }>(plans: T[]) =>
  plans.filter((plan) => !plan.duo);

/** Plans from the entry plan upwards, for explaining what each one adds. */
export const plansByTier = <T extends PlanTier>(plans: T[]) =>
  byTier(plans) as (T & { tier: number })[];

/**
 * Whether an item in Plus can be had soon, in words
 * (`public.plus_availability`): a copy on the shelf, every copy out with
 * no more people queued than copies, more queued than copies, or no copy
 * yet.
 */
export const AVAILABILITIES = ["now", "short", "long", "coming"] as const;
export type Availability = (typeof AVAILABILITIES)[number];

/** plus_availability()'s answer, or null when the item isn't in Plus. */
export const toAvailability = (value: unknown): Availability | null =>
  AVAILABILITIES.includes(value as Availability)
    ? (value as Availability)
    : null;

/** The cheapest monthly plan for one person, for "from 14,750 a month". */
export const cheapestMonthly = <
  T extends { amount: number; billing_interval: string; duo?: boolean | null },
>(
  plans: readonly T[]
): T | null =>
  plans
    .filter((plan) => !plan.duo && plan.billing_interval === "month")
    .reduce<T | null>(
      (lowest, plan) =>
        lowest === null || plan.amount < lowest.amount ? plan : lowest,
      null
    );

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** A week before `now`, for "New this week" (ISO). */
export const weekAgo = (now = new Date()) =>
  new Date(now.getTime() - WEEK_MS).toISOString();
