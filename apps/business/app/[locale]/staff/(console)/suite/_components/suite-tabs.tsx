import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const SuiteTabs = async () => {
  const t = await getTranslations("admin.suite.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/suite", label: t("requests") },
        { href: "/suite/hiring", label: t("hiring") },
        { href: "/suite/orders", label: t("orders") },
        { href: "/suite/invoices", label: t("invoices") },
        { href: "/suite/seats", label: t("seats") },
      ]}
    />
  );
};
