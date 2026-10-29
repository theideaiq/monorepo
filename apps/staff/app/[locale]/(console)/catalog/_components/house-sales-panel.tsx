import { formatPrice, HOUSE_SELLER_ID } from "@repo/commerce";
import type { Database } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import type { ServerClient } from "@/lib/admin/session";
import {
  deleteHouseDeal,
  endHouseSale,
  removeHousePlusPrice,
  removeHouseStudentPrice,
} from "../actions";
import {
  HouseDealForm,
  HousePlusPriceForm,
  HouseSaleForm,
  HouseStudentPriceForm,
} from "./house-sale-forms";

type Copy = Pick<
  Database["public"]["Tables"]["stock_items"]["Row"],
  "condition" | "purpose" | "seller_id" | "status" | "variant_id"
>;

/** A listing's student or Plus price, with a way to remove it. */
const MemberPriceLine = ({
  disabled,
  id,
  kind,
  label,
  removeLabel,
}: {
  readonly disabled: boolean;
  readonly id: string;
  readonly kind: "plus" | "student";
  readonly label: string;
  readonly removeLabel: string;
}) => (
  <div className="flex flex-wrap items-center gap-2 text-sm">
    <span>{label}</span>
    {disabled ? null : (
      <ActionButton
        action={
          kind === "plus" ? removeHousePlusPrice : removeHouseStudentPrice
        }
        fields={{ id }}
        variant="ghost"
      >
        {removeLabel}
      </ActionButton>
    )}
  </div>
);

/**
 * Sales, quantity deals, student and Plus prices on The IDEA's own copies of
 * this product, one block per version and condition for sale. Both stay above the margin
 * floor (the database refuses lower ones).
 */
export const HouseSalesPanel = async ({
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
  const t = await getTranslations("admin.catalog.sales");
  const conditions = await getTranslations("store.condition");
  const locale = (await getLocale()) as Locale;
  const format = formatters(locale);
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
  const ids = listings.map((copy) => copy.variant_id);
  const [
    { data: sales },
    { data: deals },
    { data: students },
    { data: pluses },
  ] = await Promise.all([
    supabase
      .from("listing_sales")
      .select("id, variant_id, condition, sale_price, starts_at, ends_at")
      .eq("seller_id", HOUSE_SELLER_ID)
      .in("variant_id", ids)
      .gt("ends_at", new Date().toISOString())
      .order("starts_at"),
    supabase
      .from("quantity_deals")
      .select("id, variant_id, condition, min_quantity, discount_rate")
      .eq("seller_id", HOUSE_SELLER_ID)
      .in("variant_id", ids)
      .order("min_quantity"),
    supabase
      .from("student_prices")
      .select("id, variant_id, condition, price")
      .eq("seller_id", HOUSE_SELLER_ID)
      .in("variant_id", ids),
    supabase
      .from("plus_prices")
      .select("id, variant_id, condition, price")
      .eq("seller_id", HOUSE_SELLER_ID)
      .in("variant_id", ids),
  ]);
  const same = (copy: Copy, row: { condition: string; variant_id: string }) =>
    row.variant_id === copy.variant_id && row.condition === copy.condition;

  return (
    <Panel description={t("panelDescription")} title={t("panelTitle")}>
      {listings.map((copy) => {
        const variant = variants.find((item) => item.id === copy.variant_id);
        return (
          <div
            className="grid gap-3 border-b py-3 last:border-0"
            key={`${copy.variant_id}:${copy.condition}`}
          >
            <p className="font-medium text-sm">
              {variants.length > 1 && variant
                ? `${variant.label} · ${conditions(copy.condition)}`
                : conditions(copy.condition)}
            </p>
            {(sales ?? [])
              .filter((sale) => same(copy, sale))
              .map((sale) => (
                <div
                  className="flex flex-wrap items-center gap-2 text-sm"
                  key={sale.id}
                >
                  <span>
                    {t("sale", {
                      ends: format.dateTime(sale.ends_at),
                      price: formatPrice(sale.sale_price, locale),
                      starts: format.dateTime(sale.starts_at),
                    })}
                  </span>
                  {disabled ? null : (
                    <ActionButton
                      action={endHouseSale}
                      fields={{ id: sale.id }}
                      variant="ghost"
                    >
                      {t("endSale")}
                    </ActionButton>
                  )}
                </div>
              ))}
            {(deals ?? [])
              .filter((deal) => same(copy, deal))
              .map((deal) => (
                <div
                  className="flex flex-wrap items-center gap-2 text-sm"
                  key={deal.id}
                >
                  <span>
                    {t("deal", {
                      from: format.number(deal.min_quantity),
                      rate: format.number(deal.discount_rate),
                    })}
                  </span>
                  {disabled ? null : (
                    <ActionButton
                      action={deleteHouseDeal}
                      fields={{ id: deal.id }}
                      variant="ghost"
                    >
                      {t("removeDeal")}
                    </ActionButton>
                  )}
                </div>
              ))}
            {(students ?? [])
              .filter((row) => same(copy, row))
              .map((row) => (
                <MemberPriceLine
                  disabled={disabled}
                  id={row.id}
                  key={row.id}
                  kind="student"
                  label={t("studentPrice", {
                    price: formatPrice(row.price, locale),
                  })}
                  removeLabel={t("removeStudentPrice")}
                />
              ))}
            {(pluses ?? [])
              .filter((row) => same(copy, row))
              .map((row) => (
                <MemberPriceLine
                  disabled={disabled}
                  id={row.id}
                  key={row.id}
                  kind="plus"
                  label={t("plusPrice", {
                    price: formatPrice(row.price, locale),
                  })}
                  removeLabel={t("removeStudentPrice")}
                />
              ))}
            {disabled ? null : (
              <>
                <HouseSaleForm
                  condition={copy.condition}
                  variantId={copy.variant_id}
                />
                <HouseDealForm
                  condition={copy.condition}
                  variantId={copy.variant_id}
                />
                <HouseStudentPriceForm
                  condition={copy.condition}
                  variantId={copy.variant_id}
                />
                <HousePlusPriceForm
                  condition={copy.condition}
                  variantId={copy.variant_id}
                />
              </>
            )}
          </div>
        );
      })}
    </Panel>
  );
};
