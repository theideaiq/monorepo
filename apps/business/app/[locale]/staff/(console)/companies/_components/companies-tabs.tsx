import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const CompaniesTabs = async () => {
  const t = await getTranslations("admin.companies.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/companies", label: t("requests") },
        { href: "/companies/hiring", label: t("hiring") },
        { href: "/companies/orders", label: t("orders") },
        { href: "/companies/invoices", label: t("invoices") },
        { href: "/companies/seats", label: t("seats") },
        { href: "/companies/perks", label: t("perks") },
      ]}
    />
  );
};
