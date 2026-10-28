import { HOUSE_SELLER_ID } from "@repo/commerce";
import type { Database } from "@repo/database";
import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/admin/page";
import type { ServerClient } from "@/lib/admin/session";
import { HouseOfferSettingsForm } from "./house-offer-forms";

type Copy = Pick<
  Database["public"]["Tables"]["stock_items"]["Row"],
  "condition" | "purpose" | "seller_id" | "status" | "variant_id"
>;

/**
 * Make an offer on The IDEA's own copies of this product: one row per
 * version and condition with copies for sale. Offers below the margin
 * floor are declined automatically whatever is set here.
 */
export const HouseOffersPanel = async ({
  copies,
  disabled,
  supabase,
  variants,
}: {
  readonly copies: readonly Copy[];
  readonly disabled: boolean;
  readonly supabase: ServerClient;
  readonly variants: readonly { id: string; label: string }[];
}) => {
  const t = await getTranslations("admin.catalog.offers");
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
  ];
  if (listings.length === 0) {
    return null;
  }
  const { data: settings } = await supabase
    .from("offer_settings")
    .select(
      "variant_id, condition, accept_offers, auto_accept_at, auto_decline_below"
    )
    .eq("seller_id", HOUSE_SELLER_ID)
    .in(
      "variant_id",
      listings.map((copy) => copy.variant_id)
    );

  return (
    <Panel description={t("panelDescription")} title={t("panelTitle")}>
      {listings.map((copy) => {
        const setting = (settings ?? []).find(
          (row) =>
            row.variant_id === copy.variant_id &&
            row.condition === copy.condition
        );
        const variant = variants.find((item) => item.id === copy.variant_id);
        return (
          <HouseOfferSettingsForm
            acceptAt={setting?.auto_accept_at ?? null}
            accepting={setting?.accept_offers ?? false}
            condition={copy.condition}
            declineBelow={setting?.auto_decline_below ?? null}
            disabled={disabled}
            key={`${copy.variant_id}:${copy.condition}`}
            label={
              variants.length > 1 && variant
                ? `${variant.label} · ${conditions(copy.condition)}`
                : conditions(copy.condition)
            }
            variantId={copy.variant_id}
          />
        );
      })}
    </Panel>
  );
};
