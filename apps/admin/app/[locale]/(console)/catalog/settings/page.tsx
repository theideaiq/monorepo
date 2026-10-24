import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/page";
import { requireSection } from "@/lib/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { StoreSettingsForm } from "../_components/store-settings-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("settings") };
};

const StoreSettingsPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const { data: settings } = await supabase
    .from("store_settings")
    .select("shipping_fee, free_shipping_threshold")
    .maybeSingle();

  return (
    <>
      <PageHeader title={t("title")} />
      <CatalogTabs />
      <PageBody className="max-w-3xl">
        <Panel
          description={t("settings.description")}
          title={t("tabs.settings")}
        >
          <StoreSettingsForm
            disabled={!canWrite}
            freeShippingThreshold={settings?.free_shipping_threshold ?? null}
            shippingFee={settings?.shipping_fee ?? 0}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default StoreSettingsPage;
