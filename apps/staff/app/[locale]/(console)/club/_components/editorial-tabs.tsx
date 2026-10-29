import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const EditorialTabs = async () => {
  const t = await getTranslations("admin.editorial.tabs");

  return (
    <SectionTabs
      tabs={[
        {
          exact: true,
          href: "/club",
          label: t("posts"),
          match: ["/club/posts"],
        },
        { href: "/club/events", label: t("events") },
        { href: "/club/opportunities", label: t("opportunities") },
        { href: "/club/submissions", label: t("submissions") },
      ]}
    />
  );
};
