import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const CatalogTabs = async () => {
  const t = await getTranslations("admin.catalog.tabs");

  return (
    <SectionTabs
      tabs={[
        {
          exact: true,
          href: "/catalog",
          label: t("products"),
          match: ["/catalog/products"],
        },
        { href: "/catalog/checks", label: t("checks") },
        { href: "/catalog/offers", label: t("offers") },
        { href: "/catalog/import", label: t("import") },
        { href: "/catalog/categories", label: t("categories") },
        { href: "/catalog/plans", label: t("plans") },
        { href: "/catalog/settings", label: t("settings") },
      ]}
    />
  );
};
