import type { createAdminClient } from "@repo/database/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface SellingSweep {
  offers: number;
  returns: number;
  scores: number;
  wasPrices: number;
}

/**
 * The selling deadlines, once a day: unanswered returns are accepted and
 * unchecked returned items count as fine (`sweep_returns`), unanswered and
 * unordered offers expire (`sweep_offers`), shop scores are refreshed
 * (`refresh_seller_scores`) and "was" prices older than 30 days go
 * (`refresh_was_prices`).
 */
export const sweepSelling = async (
  admin: AdminClient
): Promise<SellingSweep> => {
  const returns = await admin.rpc("sweep_returns");
  if (returns.error) {
    throw new Error(`sweep_returns: ${returns.error.message}`);
  }
  const offers = await admin.rpc("sweep_offers");
  if (offers.error) {
    throw new Error(`sweep_offers: ${offers.error.message}`);
  }
  const scores = await admin.rpc("refresh_seller_scores");
  if (scores.error) {
    throw new Error(`refresh_seller_scores: ${scores.error.message}`);
  }
  const wasPrices = await admin.rpc("refresh_was_prices");
  if (wasPrices.error) {
    throw new Error(`refresh_was_prices: ${wasPrices.error.message}`);
  }
  return {
    offers: offers.data?.length ?? 0,
    returns: returns.data?.length ?? 0,
    scores: scores.data ?? 0,
    wasPrices: wasPrices.data ?? 0,
  };
};
