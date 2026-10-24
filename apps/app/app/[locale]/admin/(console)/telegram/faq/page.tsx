import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { FaqForm } from "../_components/telegram-forms";
import { TelegramTabs } from "../_components/telegram-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.telegram.tabs");
  return { title: t("faq") };
};

const FaqPage = async () => {
  const { canWrite, supabase } = await requireSection("telegram");
  const t = await getTranslations("admin.telegram");
  const { data: entries } = await supabase
    .from("telegram_faq")
    .select("*")
    .order("topic")
    .order("position");

  return (
    <>
      <PageHeader title={t("title")} />
      <TelegramTabs />
      <PageBody className="max-w-4xl">
        <p className="text-muted-foreground text-sm">{t("faq.description")}</p>
        {canWrite ? (
          <Panel title={t("faq.new")}>
            <FaqForm key={`new-${entries?.length ?? 0}`} />
          </Panel>
        ) : null}
        {(entries ?? []).map((entry) => (
          <FaqForm disabled={!canWrite} entry={entry} key={entry.id} />
        ))}
      </PageBody>
    </>
  );
};

export default FaqPage;
