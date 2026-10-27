import { getTranslations } from "next-intl/server";
import { SectionTabs } from "@/components/admin/section-tabs";

export const TelegramTabs = async () => {
  const t = await getTranslations("admin.telegram.tabs");

  return (
    <SectionTabs
      tabs={[
        { exact: true, href: "/club/telegram", label: t("requests") },
        { href: "/club/telegram/chats", label: t("chats") },
        { href: "/club/telegram/members", label: t("members") },
        { href: "/club/telegram/faq", label: t("faq") },
        { href: "/club/telegram/bot", label: t("bot") },
      ]}
    />
  );
};
