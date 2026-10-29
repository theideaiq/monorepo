import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { RentalRatesForm } from "../_components/rental-rates-form";
import { TermForm } from "../_components/terms-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("rentals") };
};

/** Single-item rent: the rates by category, the deposit and the terms. */
const RentalRatesPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const t = await getTranslations("admin.finance");
  const [
    { data: categories },
    { data: rates },
    { data: settings },
    { data: terms },
  ] = await Promise.all([
    supabase
      .from("product_categories")
      .select("id, name_ar, name_en")
      .order("position"),
    supabase
      .from("rental_rates")
      .select("category_id, price, days, late_fee, per_term"),
    supabase.from("store_settings").select("rental_deposit_rate").maybeSingle(),
    supabase.from("academic_terms").select("*").order("starts_on"),
  ]);
  const byCategory = new Map(
    (rates ?? []).map((rate) => [rate.category_id, rate])
  );

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody className="max-w-4xl">
        <Panel description={t("rentals.hint")} title={t("rentals.title")}>
          <RentalRatesForm
            categories={(categories ?? []).map((category) => {
              const rate = byCategory.get(category.id);
              return {
                ...category,
                days: rate?.days ?? null,
                late_fee: rate?.late_fee ?? null,
                per_term: rate?.per_term ?? false,
                price: rate?.price ?? null,
              };
            })}
            depositRate={Number(settings?.rental_deposit_rate ?? 50)}
            disabled={!canWrite}
          />
        </Panel>
        <Panel description={t("terms.hint")} title={t("terms.title")}>
          {(terms ?? []).map((term) => (
            <TermForm disabled={!canWrite} key={term.id} term={term} />
          ))}
          {canWrite ? <TermForm key={`new-${terms?.length ?? 0}`} /> : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default RentalRatesPage;
