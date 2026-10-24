import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { CampaignForm } from "../../_components/campaign-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.marketing.campaigns");
  return { title: t("new") };
};

const NewCampaignPage = async () => {
  const { supabase } = await requireSection("marketing", "write");
  const t = await getTranslations("admin.marketing");
  const { data: segments } = await supabase
    .from("marketing_segments")
    .select("id, name")
    .order("name");

  return (
    <>
      <PageHeader
        back={{ href: "/marketing", label: t("title") }}
        title={t("campaigns.new")}
      />
      <PageBody className="max-w-4xl">
        <CampaignForm segments={segments ?? []} />
      </PageBody>
    </>
  );
};

export default NewCampaignPage;
