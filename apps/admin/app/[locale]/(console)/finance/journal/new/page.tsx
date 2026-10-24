import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/page";
import { todayInBaghdad } from "@/lib/dates";
import { requireSection } from "@/lib/session";
import { JournalForm } from "../../_components/journal-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.journal");
  return { title: t("new") };
};

const NewJournalEntryPage = async () => {
  const { supabase } = await requireSection("finance", "write");
  const t = await getTranslations("admin.finance");
  const { data: accounts } = await supabase
    .from("chart_of_accounts")
    .select("id, code, name")
    .eq("active", true)
    .order("code");

  return (
    <>
      <PageHeader
        back={{ href: "/finance/journal", label: t("tabs.journal") }}
        description={t("journal.newHint")}
        title={t("journal.new")}
      />
      <PageBody className="max-w-5xl">
        <JournalForm accounts={accounts ?? []} today={todayInBaghdad()} />
      </PageBody>
    </>
  );
};

export default NewJournalEntryPage;
