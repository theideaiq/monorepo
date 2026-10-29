import type { createAdminClient } from "@repo/database/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface SellingSweep {
  auctions: number;
  offers: number;
  returns: number;
  sales: number;
  scores: number;
  wasPrices: number;
}

/**
 * The selling deadlines, once a day: unanswered returns are accepted and
 * unchecked returned items count as fine (`sweep_returns`), unanswered and
 * unordered offers expire (`sweep_offers`), auction deadlines are applied
 * (`settle_auctions`, which auction pages also run), shop scores are refreshed
 * (`refresh_seller_scores`), prices left by sales that started or ended
 * are recorded (`sweep_listing_sales`) and "was" prices older than 30 days
 * go (`refresh_was_prices`).
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
  const auctions = await admin.rpc("settle_auctions");
  if (auctions.error) {
    throw new Error(`settle_auctions: ${auctions.error.message}`);
  }
  const scores = await admin.rpc("refresh_seller_scores");
  if (scores.error) {
    throw new Error(`refresh_seller_scores: ${scores.error.message}`);
  }
  const sales = await admin.rpc("sweep_listing_sales");
  if (sales.error) {
    throw new Error(`sweep_listing_sales: ${sales.error.message}`);
  }
  const wasPrices = await admin.rpc("refresh_was_prices");
  if (wasPrices.error) {
    throw new Error(`refresh_was_prices: ${wasPrices.error.message}`);
  }
  return {
    auctions: auctions.data ?? 0,
    offers: offers.data?.length ?? 0,
    returns: returns.data?.length ?? 0,
    sales: sales.data ?? 0,
    scores: scores.data ?? 0,
    wasPrices: wasPrices.data ?? 0,
  };
};
