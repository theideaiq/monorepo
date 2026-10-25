import type { Enums } from "@repo/database";

/**
 * Bulbs, The IDEA Pass rewards: 1 Bulb = 100 IQD. The tier comes from the
 * spend on delivered orders in the last 12 months (`my_bulbs()`); its
 * thresholds and rates live in `bulb_tiers`.
 */

export type BulbTier = Enums<"bulb_tier">;

export const bulbTiers = [
  "glow",
  "shine",
  "beam",
  "blaze",
] as const satisfies readonly BulbTier[];

/** Perks beyond cashback, as keys under `app.bulbs.perks`. */
export const tierPerks: Record<
  BulbTier,
  readonly ("club" | "priority" | "support")[]
> = {
  beam: [],
  blaze: ["club", "priority", "support"],
  glow: [],
  shine: [],
};

/** How far the spend has come towards the next tier, from 0 to 1. */
export const tierProgress = (
  spend: number,
  currentMin: number,
  nextMin: number | null
) => {
  if (nextMin === null || nextMin <= currentMin) {
    return 1;
  }
  return Math.min(
    1,
    Math.max(0, (spend - currentMin) / (nextMin - currentMin))
  );
};

/** The card's look for each tier (the Pass card changes colour with it). */
export const tierCardBackground: Record<BulbTier, string> = {
  beam: "bg-[radial-gradient(120%_90%_at_10%_0%,#8b74ff_0%,#5b3be8_45%,#1f2a8f_100%)]",
  blaze:
    "bg-[radial-gradient(120%_90%_at_10%_0%,#4a3a12_0%,#1f1a10_45%,#0f1014_100%)]",
  glow: "bg-[radial-gradient(120%_90%_at_10%_0%,#f0507f_0%,#d81b60_45%,#8f0f3f_100%)]",
  shine:
    "bg-[radial-gradient(120%_90%_at_10%_0%,#f6c453_0%,#d99a12_45%,#8a5a00_100%)]",
};
