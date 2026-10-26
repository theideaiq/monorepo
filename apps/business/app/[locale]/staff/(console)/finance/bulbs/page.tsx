import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatCard } from "@/components/admin/stat-card";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";
import { MoneyRulesForm } from "../_components/money-rules-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("bulbs") };
};

/**
 * Bulbs and the money rules for finance: what members hold (what The IDEA
 * owes), then the rules: the Bulbs rate, half rate and multipliers (Plus
 * plans set their own rate in Catalog → Plans), the return window, the
 * giveaway cap, the cash limit and what the price check counts.
 */
const BulbsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const [{ data: outstanding }, { data: settings }, { data: categories }] =
    await Promise.all([
      supabase.rpc("bulbs_outstanding"),
      supabase
        .from("store_settings")
        .select(
          "bulb_rate, bulb_half_from, return_days, max_giveaway_rate, cash_limit, payment_fee_rate, delivery_cost, min_margin_rate"
        )
        .maybeSingle(),
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
        {settings ? (
          <Panel description={t("rules.hint")} title={t("rules.title")}>
            <MoneyRulesForm
              categories={categories ?? []}
              disabled={!canWrite}
              rules={{
                ...settings,
                bulb_rate: Number(settings.bulb_rate),
                max_giveaway_rate: Number(settings.max_giveaway_rate),
                min_margin_rate: Number(settings.min_margin_rate),
                payment_fee_rate: Number(settings.payment_fee_rate),
              }}
            />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default BulbsPage;
