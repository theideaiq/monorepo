import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { DeliveryZoneForm } from "../_components/delivery-zone-form";
import { StoreSettingsForm } from "../_components/store-settings-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("settings") };
};

const StoreSettingsPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const [{ data: settings }, { data: zones }] = await Promise.all([
    supabase
      .from("store_settings")
      .select(
        "shipping_fee, cash_on_delivery_enabled, require_verified_phone, wayl_return_refunds"
      )
      .maybeSingle(),
    supabase
      .from("delivery_zones")
      .select("*")
      .order("position")
      .order("name_en"),
  ]);

  return (
    <>
      <PageHeader title={t("title")} />
      <CatalogTabs />
      <PageBody className="max-w-5xl">
        <Panel
          description={t("settings.description")}
          title={t("tabs.settings")}
        >
          <StoreSettingsForm
            disabled={!canWrite}
            settings={{
              cash_on_delivery_enabled:
                settings?.cash_on_delivery_enabled ?? false,
              require_verified_phone: settings?.require_verified_phone ?? false,
              shipping_fee: settings?.shipping_fee ?? 0,
              wayl_return_refunds: settings?.wayl_return_refunds ?? false,
            }}
          />
        </Panel>
        <Panel
          description={t("settings.zones.description")}
          title={t("settings.zones.title")}
        >
          {(zones ?? []).map((zone) => (
            <DeliveryZoneForm disabled={!canWrite} key={zone.id} zone={zone} />
          ))}
        </Panel>
        {canWrite ? (
          <Panel title={t("settings.zones.new")}>
            <DeliveryZoneForm key={`new-${zones?.length ?? 0}`} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default StoreSettingsPage;
