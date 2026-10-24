import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { ChatForm } from "../_components/telegram-forms";
import { TelegramTabs } from "../_components/telegram-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.telegram.tabs");
  return { title: t("chats") };
};

const ChatsPage = async () => {
  const { canWrite, supabase } = await requireSection("telegram");
  const t = await getTranslations("admin.telegram");
  const { data: chats } = await supabase
    .from("telegram_chats")
    .select("*")
    .order("title");

  return (
    <>
      <PageHeader title={t("title")} />
      <TelegramTabs />
      <PageBody>
        <Panel description={t("chats.description")} title={t("tabs.chats")}>
          {(chats ?? []).length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("chats.empty")}</p>
          ) : null}
          {(chats ?? []).map((chat) => (
            <ChatForm chat={chat} disabled={!canWrite} key={chat.id} />
          ))}
        </Panel>
        {canWrite ? (
          <Panel title={t("chats.new")}>
            <ChatForm key={`new-${chats?.length ?? 0}`} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default ChatsPage;
