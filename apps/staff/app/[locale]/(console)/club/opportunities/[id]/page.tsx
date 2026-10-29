import { localized } from "@repo/commerce";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { env } from "@/env";
import { toBaghdadInput } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { OpportunityForm } from "../../_components/opportunity-form";
import {
  FeatureOpportunityForm,
  ReviewOpportunityForm,
} from "../../_components/opportunity-review";
import { closeOpportunity, deleteOpportunity } from "../../actions";

type Status =
  | "approved"
  | "changes"
  | "closed"
  | "draft"
  | "pending"
  | "rejected";

/**
 * One opportunity: its details (editors correct an organization's without
 * sending it back for review), the review decision, featuring and closing.
 */
const OpportunityPage = async ({
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
  const format = formatters(locale);

  const { data: opportunity } = await supabase
    .from("opportunities")
    .select("*, organization:organizations (name)")
    .eq("id", id)
    .maybeSingle();
  if (!opportunity) {
    notFound();
  }
  const { organization, ...row } = opportunity;
  const runBy = (Array.isArray(organization) ? organization[0] : organization)
    ?.name;
  const status = row.status as Status;

  return (
    <>
      <PageHeader
        back={{ href: "/club/opportunities", label: t("tabs.opportunities") }}
        description={runBy ?? t("opportunities.theIdea")}
        title={localized(row, "title", locale)}
      >
        <ActionButton
          action={deleteOpportunity}
          confirm={{
            description: t("opportunities.deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: row.id }}
          variant="destructive"
        >
          {tCommon("delete")}
        </ActionButton>
      </PageHeader>
      <PageBody className="xl:grid-cols-[1fr_22rem]">
        <OpportunityForm
          deadline={toBaghdadInput(row.deadline)}
          opensAt={toBaghdadInput(row.opens_at)}
          opportunity={row}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
        <div className="grid content-start gap-4">
          <Panel title={t("opportunities.status")}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge status={status}>
                {t(`opportunities.statuses.${status}`)}
              </StatusBadge>
              {row.submitted_at ? (
                <span className="text-muted-foreground">
                  {t("opportunities.submitted", {
                    date: format.dateTime(row.submitted_at),
                  })}
                </span>
              ) : null}
            </div>
            {row.review_note ? (
              <p className="text-muted-foreground text-sm">{row.review_note}</p>
            ) : null}
            {runBy && status === "pending" ? (
              <ReviewOpportunityForm id={row.id} />
            ) : null}
            {status === "approved" ? (
              <ActionButton
                action={closeOpportunity}
                confirm={{ title: t("opportunities.closeConfirm") }}
                fields={{ id: row.id }}
                variant="outline"
              >
                {t("opportunities.close")}
              </ActionButton>
            ) : null}
          </Panel>
          <Panel
            description={t("opportunities.featuredDescription")}
            title={t("opportunities.featuring")}
          >
            <FeatureOpportunityForm
              id={row.id}
              until={toBaghdadInput(row.featured_until)}
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default OpportunityPage;
