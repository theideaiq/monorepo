import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { Database } from "@repo/database";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/admin/page";
import { HouseAuctionForm } from "./auction-forms";

type Copy = Pick<
  Database["public"]["Tables"]["stock_items"]["Row"],
  "condition" | "purpose" | "seller_id" | "status" | "variant_id"
>;

/**
 * Auction one of The IDEA's copies of this product: for collectible
 * products, or a copy Staff mark signed, limited or rare (or a used copy
 * in a category open for auctions). The database checks which.
 */
export const HouseAuctionPanel = async ({
  copies,
  disabled,
  supabaseUrl,
  variants,
}: {
  readonly copies: readonly Copy[];
  readonly disabled: boolean;
  readonly supabaseUrl: string;
  readonly variants: readonly { id: string; label: string }[];
}) => {
  if (disabled) {
    return null;
  }
  const t = await getTranslations("admin.catalog.auctions");
  const conditions = await getTranslations("store.condition");
  const listings = [
    ...new Map(
      copies
        .filter(
          (copy) =>
            copy.seller_id === HOUSE_SELLER_ID &&
            copy.purpose === "sale" &&
            copy.status === "available"
        )
        .map((copy) => [`${copy.variant_id}:${copy.condition}`, copy])
    ).values(),
  ].map((copy) => {
    const variant = variants.find((item) => item.id === copy.variant_id);
    return {
      condition: copy.condition,
      label:
        variants.length > 1 && variant
          ? `${variant.label} · ${conditions(copy.condition)}`
          : conditions(copy.condition),
      variantId: copy.variant_id,
    };
  });
  if (listings.length === 0) {
    return null;
  }
  return (
    <Panel description={t("panelDescription")} title={t("panelTitle")}>
      <HouseAuctionForm listings={listings} supabaseUrl={supabaseUrl} />
    </Panel>
  );
};
