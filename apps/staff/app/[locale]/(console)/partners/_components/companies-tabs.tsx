import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const CompaniesTabs = async () => {
  const t = await getTranslations("admin.companies.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/partners", label: t("requests") },
        { href: "/partners/orders", label: t("orders") },
        { href: "/partners/invoices", label: t("invoices") },
        { href: "/partners/seats", label: t("seats") },
        { href: "/partners/shops", label: t("shops") },
        { href: "/partners/perks", label: t("perks") },
        { href: "/partners/sign-in", label: t("signIn") },
      ]}
    />
  );
};
