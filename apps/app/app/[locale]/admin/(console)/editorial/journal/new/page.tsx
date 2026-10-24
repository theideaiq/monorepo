import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { env } from "@/env";
import { requireSection } from "@/lib/admin/session";
import { IssueForm } from "../../_components/issue-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.journal");
  return { title: t("new") };
};

const NewIssuePage = async () => {
  await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial");

  return (
    <>
      <PageHeader
        back={{ href: "/editorial/journal", label: t("tabs.journal") }}
        title={t("journal.new")}
      />
      <PageBody className="max-w-4xl">
        <IssueForm
          mode="draft"
          publishAt=""
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default NewIssuePage;
