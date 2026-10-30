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
        { href: "/finance/programs", label: t("programs") },
        { href: "/finance/bulbs", label: t("bulbs") },
        { href: "/finance/prices", label: t("prices") },
        { href: "/finance/coupons", label: t("coupons") },
        { href: "/finance/codes", label: t("codes") },
        { href: "/finance/rentals", label: t("rentals") },
        { href: "/finance/settings", label: t("settings") },
      ]}
    />
  );
};
