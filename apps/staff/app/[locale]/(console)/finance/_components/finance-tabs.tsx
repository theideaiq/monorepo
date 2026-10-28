import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const FinanceTabs = async () => {
  const t = await getTranslations("admin.finance.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/finance", label: t("dashboard") },
        { href: "/finance/journal", label: t("journal") },
        { href: "/finance/accounts", label: t("accounts") },
        { href: "/finance/payments", label: t("payments") },
        { href: "/finance/payouts", label: t("payouts") },
        { href: "/finance/bulbs", label: t("bulbs") },
        { href: "/finance/prices", label: t("prices") },
        { href: "/finance/rentals", label: t("rentals") },
        { href: "/finance/settings", label: t("settings") },
      ]}
    />
  );
};
