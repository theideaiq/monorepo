import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { todayInBaghdad } from "@/lib/admin/dates";
import { scenarioFrom } from "@/lib/admin/finance";
import type { SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { JournalForm } from "../../_components/journal-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.journal");
  return { title: t("new") };
};

const NewJournalEntryPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("finance", "write");
  const scenario = scenarioFrom(await searchParams);
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
        <JournalForm
          accounts={accounts ?? []}
          scenario={scenario}
          today={todayInBaghdad()}
        />
      </PageBody>
    </>
  );
};

export default NewJournalEntryPage;
