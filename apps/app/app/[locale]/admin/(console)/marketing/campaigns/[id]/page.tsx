import { BrandLogo } from "@repo/design-system/components/brand-logo";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { MarkdownPreview } from "@/components/admin/markdown-preview";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { CampaignForm } from "../../_components/campaign-form";
import { deleteCampaign, sendCampaign } from "../../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.marketing.campaigns");
  return { title: t("detail") };
};

const CampaignPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, supabase } = await requireSection("marketing");
  const t = await getTranslations("admin.marketing");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(await getLocale());

  const [{ data: campaign }, { data: segments }] = await Promise.all([
    supabase
      .from("marketing_campaigns")
      .select("*, marketing_segments(name)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("marketing_segments").select("id, name").order("name"),
  ]);
  if (!campaign) {
    notFound();
  }
  const isDraft = campaign.status === "draft";
  const editable = isDraft && canWrite;
  const audience = campaign.marketing_segments?.name ?? t("campaigns.everyone");

  return (
    <>
      <PageHeader
        back={{ href: "/marketing", label: t("title") }}
        description={audience}
        title={campaign.subject}
      >
        <StatusBadge status={campaign.status}>
          {t(`campaignStatus.${campaign.status}`)}
        </StatusBadge>
        {editable ? (
          <>
            <ActionButton
              action={deleteCampaign}
              confirm={{ title: tCommon("deleteConfirm") }}
              fields={{ id: campaign.id }}
              variant="ghost"
            >
              {tCommon("delete")}
            </ActionButton>
            <ActionButton
              action={sendCampaign}
              confirm={{
                description: t("campaigns.sendDescription", { audience }),
                title: t("campaigns.sendConfirm"),
              }}
              fields={{ id: campaign.id }}
              variant="default"
            >
              {t("campaigns.send")}
            </ActionButton>
          </>
        ) : null}
      </PageHeader>
      <PageBody className="xl:grid-cols-2">
        {editable ? (
          <Panel title={t("campaigns.draft")}>
            <CampaignForm campaign={campaign} segments={segments ?? []} />
          </Panel>
        ) : (
          <Panel title={t("campaigns.results")}>
            <DetailList
              items={[
                { label: t("campaigns.segment"), value: audience },
                {
                  label: t("campaigns.sentCount"),
                  value: format.number(campaign.sent_count),
                },
                {
                  label: t("campaigns.sentAt"),
                  value: format.dateTime(campaign.sent_at),
                },
                {
                  label: tCommon("createdAt"),
                  value: format.dateTime(campaign.created_at),
                },
              ]}
            />
            {campaign.status === "failed" ? (
              <p className="text-destructive text-sm">
                {t("campaigns.failedHint")}
              </p>
            ) : null}
          </Panel>
        )}
        <Panel
          description={t("campaigns.previewHint")}
          title={t("campaigns.preview")}
        >
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-brand px-5 py-3 text-brand-foreground">
              <BrandLogo className="[&_svg]:text-brand-foreground" />
            </div>
            <div className="bg-white p-5 text-zinc-900" dir="auto">
              <MarkdownPreview invert={false} source={campaign.body} />
            </div>
          </div>
        </Panel>
      </PageBody>
    </>
  );
};

export default CampaignPage;
