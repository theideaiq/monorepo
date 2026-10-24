import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/section-tabs";

export const MarketingTabs = async () => {
  const t = await getTranslations("admin.marketing.tabs");

  return (
    <SectionTabs
      tabs={[
        {
          exact: true,
          href: "/marketing",
          label: t("campaigns"),
          match: ["/marketing/campaigns"],
        },
        { href: "/marketing/segments", label: t("segments") },
      ]}
    />
  );
};
