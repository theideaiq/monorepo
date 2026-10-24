import { localized } from "@repo/commerce";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { toBaghdadInput } from "@/lib/admin/dates";
import { isUuid } from "@/lib/admin/list";
import { publishState } from "@/lib/admin/publishing";
import { requireSection } from "@/lib/admin/session";
import { IssueForm } from "../../_components/issue-form";
import { deleteIssue } from "../../actions";

const modes = {
  draft: "draft",
  published: "now",
  scheduled: "schedule",
} as const;

const IssuePage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("editorial", "write");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const tCommon = await getTranslations("admin.common");
  const { data: issue } = await supabase
    .from("journal_issues")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!issue) {
    notFound();
  }
  const state = publishState(issue.published_at);

  return (
    <>
      <PageHeader
        back={{ href: "/editorial/journal", label: t("tabs.journal") }}
        description={t("journal.volumeIssue", {
          issue: String(issue.issue),
          volume: String(issue.volume),
        })}
        title={localized(issue, "title", locale)}
      >
        <StatusBadge status={state}>{t(`publish.states.${state}`)}</StatusBadge>
        <ActionButton
          action={deleteIssue}
          confirm={{
            description: tCommon("deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: issue.id }}
          variant="destructive"
        >
          {tCommon("delete")}
        </ActionButton>
      </PageHeader>
      <PageBody className="max-w-4xl">
        <IssueForm
          issue={issue}
          mode={modes[state]}
          publishAt={
            state === "scheduled" ? toBaghdadInput(issue.published_at) : ""
          }
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default IssuePage;
