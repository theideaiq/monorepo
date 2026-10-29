import "server-only";

import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { ServerClient } from "./session";

/** Who owns a copy or kit unit, as the supplier selects list them. */
export interface SupplierOption {
  id: string;
  name: string;
}

/**
 * Shops that supply The IDEA (`supply_terms`, staff admins can read them),
 * The IDEA itself first. Without the right to read the terms, only The
 * IDEA is offered.
 */
export const supplierOptions = async (
  supabase: ServerClient,
  houseName: string
): Promise<SupplierOption[]> => {
  const { data } = await supabase
    .from("supply_terms")
    .select("seller_id, active, seller:sellers (name)")
    .order("created_at");
  return [
    { id: HOUSE_SELLER_ID, name: houseName },
    ...(data ?? []).map((row) => ({
      id: row.seller_id,
      name: row.seller?.name ?? row.seller_id,
    })),
  ];
};
