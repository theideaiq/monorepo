import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { parseCriteria } from "@/lib/admin/segments";
import { requireSection } from "@/lib/admin/session";
import { MarketingTabs } from "../_components/marketing-tabs";
import { SegmentForm } from "../_components/segment-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.marketing.tabs");
  return { title: t("segments") };
};

const SegmentsPage = async () => {
  const { canWrite, supabase } = await requireSection("marketing");
  const t = await getTranslations("admin.marketing");
  const { data: segments } = await supabase
    .from("marketing_segments")
    .select("id, name, criteria")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader title={t("title")} />
      <MarketingTabs />
      <PageBody className="max-w-4xl">
        <p className="text-muted-foreground text-sm">
          {t("segments.description")}
        </p>
        {canWrite ? (
          <Panel title={t("segments.new")}>
            <SegmentForm key={`new-${segments?.length ?? 0}`} />
          </Panel>
        ) : null}
        {(segments ?? []).map((segment) => (
          <SegmentForm
            disabled={!canWrite}
            key={segment.id}
            segment={{
              criteria: parseCriteria(segment.criteria),
              id: segment.id,
              name: segment.name,
            }}
          />
        ))}
      </PageBody>
    </>
  );
};

export default SegmentsPage;
