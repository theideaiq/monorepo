import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const TelegramTabs = async () => {
  const t = await getTranslations("admin.telegram.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/telegram", label: t("requests") },
        { href: "/telegram/chats", label: t("chats") },
        { href: "/telegram/members", label: t("members") },
        { href: "/telegram/faq", label: t("faq") },
      ]}
    />
  );
};
