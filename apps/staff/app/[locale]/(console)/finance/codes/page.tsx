import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { DigitalBrandForm } from "../_components/digital-brand-form";
import { DigitalProductForm } from "../_components/digital-product-form";
import { FinanceTabs } from "../_components/finance-tabs";
import {
  releaseDigitalCodes,
  retryDigitalCode,
  syncDigitalCatalog,
} from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.codes");
  return { title: t("title") };
};

/**
 * Finance → Codes: digital codes that need someone (a large first order
 * held, a code the supplier couldn't sell), then every denomination with
 * its cost, margin and price.
 */
const CodesPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance.codes");
  const format = formatters(locale);

  const [{ data: brands }, { data: products }, { data: waiting }] =
    await Promise.all([
      supabase
        .from("digital_brands")
        .select("id, name_en, name_ar, region_en, region_ar, active")
        .order("position")
        .order("name_en"),
      supabase.rpc("staff_digital_products"),
      supabase
        .from("digital_codes")
        .select("id, order_id, status, failure, created_at")
        .in("status", ["held", "failed"])
        .order("created_at")
        .limit(100),
    ]);
  const heldOrders = [
    ...new Set(
      (waiting ?? [])
        .filter((code) => code.status === "held")
        .map((code) => code.order_id)
    ),
  ];
  const failed = (waiting ?? []).filter((code) => code.status === "failed");

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <FinanceTabs />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("attention")}</h2>
          {heldOrders.length === 0 && failed.length === 0 ? (
            <EmptyState title={t("nothingWaiting")} />
          ) : null}
          <ul className="grid gap-2">
            {heldOrders.map((order) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                key={order}
              >
                <span className="text-sm">
                  {t("held", { order: order.slice(0, 8) })}
                </span>
                {canWrite ? (
                  <ActionButton action={releaseDigitalCodes} fields={{ order }}>
                    {t("release")}
                  </ActionButton>
                ) : null}
              </li>
            ))}
            {failed.map((code) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                key={code.id}
              >
                <span className="grid gap-0.5 text-sm">
                  <span>
                    {t("failed", { date: format.dateTime(code.created_at) })}
                  </span>
                  {code.failure ? (
                    <span className="text-muted-foreground text-xs">
                      {code.failure}
                    </span>
                  ) : null}
                </span>
                {canWrite ? (
                  <ActionButton
                    action={retryDigitalCode}
                    fields={{ id: code.id }}
                  >
                    {t("retry")}
                  </ActionButton>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-lg">{t("denominations")}</h2>
            {canWrite ? (
              <ActionButton action={syncDigitalCatalog} fields={{}}>
                {t("sync")}
              </ActionButton>
            ) : null}
          </div>
          {(brands ?? []).length === 0 ? (
            <EmptyState title={t("empty")} />
          ) : null}
          <ul className="grid gap-3">
            {(brands ?? []).map((brand) => (
              <li className="grid gap-3 rounded-lg border p-4" key={brand.id}>
                <p className="font-medium">
                  {brand.name_en} · {brand.region_en}
                  {brand.active ? "" : ` · ${t("brandOff")}`}
                </p>
                {canWrite ? (
                  <DigitalBrandForm
                    active={brand.active}
                    id={brand.id}
                    nameAr={brand.name_ar}
                    regionAr={brand.region_ar}
                  />
                ) : null}
                <ul className="grid gap-2">
                  {(products ?? [])
                    .filter((product) => product.brand_id === brand.id)
                    .map((product) => (
                      <li
                        className="grid gap-2 rounded-md bg-muted/40 p-3"
                        key={product.id}
                      >
                        <p className="text-sm">
                          {product.face_currency}{" "}
                          {format.number(Number(product.face_value))}
                          {" · "}
                          {t("pricing", {
                            cost: `$${format.number(Number(product.cost_usd))}`,
                            price: format.money(product.price),
                            supplier: product.supplier,
                          })}
                        </p>
                        {canWrite ? (
                          <DigitalProductForm
                            active={product.active}
                            id={product.id}
                            margin={
                              product.margin_rate === null
                                ? null
                                : Number(product.margin_rate)
                            }
                          />
                        ) : null}
                      </li>
                    ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </PageBody>
    </>
  );
};

export default CodesPage;
