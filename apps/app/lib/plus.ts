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
