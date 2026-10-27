import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const EditorialTabs = async () => {
  const t = await getTranslations("admin.editorial.tabs");

  return (
    <SectionTabs
      tabs={[
        {
          exact: true,
          href: "/editorial",
          label: t("posts"),
          match: ["/editorial/posts"],
        },
        { href: "/editorial/events", label: t("events") },
        { href: "/editorial/submissions", label: t("submissions") },
      ]}
    />
  );
};
