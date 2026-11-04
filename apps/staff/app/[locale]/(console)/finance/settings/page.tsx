import { intlLocale } from "@repo/internationalization/format";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { requireSection } from "@/lib/admin/session";
import { CommissionForm } from "../_components/commission-form";
import { FinanceTabs } from "../_components/finance-tabs";
import { SettingsForm } from "../_components/settings-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("settings") };
};

/** The single row of financial settings. */
const FinancialSettingsPage = async () => {
  const { canWrite, supabase } = await requireSection("finance");
  const locale = await getLocale();
  const t = await getTranslations("admin.finance");
  const format = formatters(locale);
  const [{ data: settings }, { data: rates }] = await Promise.all([
    supabase.from("financial_settings").select("*").maybeSingle(),
    supabase
      .from("commission_rates")
      .select(
        "category_id, standard_rate, pro_rate, category:product_categories!inner (name_ar, name_en, parent_id, position)"
      ),
  ]);
  const commission = (rates ?? [])
    .filter((row) => row.category.parent_id === null)
    .sort((a, b) => (a.category.position ?? 0) - (b.category.position ?? 0))
    .map((row) => ({
      categoryId: row.category_id,
      nameAr: row.category.name_ar,
      nameEn: row.category.name_en,
      pro: Number(row.pro_rate),
      standard: Number(row.standard_rate),
    }));

  const monthName = new Intl.DateTimeFormat(intlLocale(locale), {
    month: "long",
    timeZone: "UTC",
  });
  const months = Array.from({ length: 12 }, (_, index) =>
    monthName.format(new Date(Date.UTC(2026, index, 15)))
  );

  return (
    <>
      <PageHeader title={t("title")} />
      <FinanceTabs />
      <PageBody className="max-w-4xl">
        <p className="text-muted-foreground text-sm">
          {settings
            ? t("settings.updated", {
                date: format.dateTime(settings.updated_at),
              })
            : t("settings.description")}
        </p>
        <SettingsForm
          disabled={!canWrite}
          months={months}
          settings={settings}
        />
        {commission.length > 0 ? (
          <CommissionForm disabled={!canWrite} rows={commission} />
        ) : null}
      </PageBody>
    </>
  );
};

export default FinancialSettingsPage;
