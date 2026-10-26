import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatCard } from "@/components/admin/stat-card";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { BulbRatesForm } from "../_components/bulb-rates-form";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("bulbs") };
};

/**
 * Bulbs for finance: what members hold (what The IDEA owes) and the rates:
 * each tier's spend and cashback, the Plus bonus and category multipliers.
 */
const BulbsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const [
    { data: outstanding },
    { data: tiers },
    { data: settings },
    { data: categories },
  ] = await Promise.all([
    supabase.rpc("bulbs_outstanding"),
    supabase
      .from("bulb_tiers")
      .select("tier, min_spend, rate, free_delivery_from")
      .order("min_spend"),
    supabase.from("store_settings").select("bulb_plus_bonus").maybeSingle(),
    supabase
      .from("product_categories")
      .select("id, name_ar, name_en, bulb_multiplier")
      .order("position"),
  ]);
  const held = outstanding?.[0];

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody className="max-w-4xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("bulbs.available")}
            value={format.number(held?.available ?? 0)}
          />
          <StatCard
            label={t("bulbs.pending")}
            value={format.number(held?.pending ?? 0)}
          />
          <StatCard
            hint={t("bulbs.valueHint")}
            label={t("bulbs.value")}
            value={format.money(held?.value_iqd ?? 0)}
          />
        </div>
        <Panel description={t("bulbs.ratesHint")} title={t("bulbs.rates")}>
          <BulbRatesForm
            categories={categories ?? []}
            disabled={!canWrite}
            plusBonus={Number(settings?.bulb_plus_bonus ?? 1)}
            tiers={tiers ?? []}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default BulbsPage;
