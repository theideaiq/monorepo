import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { env } from "@/env";
import { requireSection } from "@/lib/admin/session";
import { OpportunityForm } from "../../_components/opportunity-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.opportunities");
  return { title: t("new") };
};

/**
 * One of The IDEA's own opportunities (programs, competitions, …), or an
 * outside organization's, under an unclaimed organization.
 */
const NewOpportunityPage = async () => {
  const { supabase } = await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial");
  const { data: hosts } = await supabase.rpc("unclaimed_organizations");

  return (
    <>
      <PageHeader
        back={{ href: "/club/opportunities", label: t("tabs.opportunities") }}
        title={t("opportunities.new")}
      />
      <PageBody className="max-w-5xl">
        <OpportunityForm
          deadline=""
          hosts={hosts ?? []}
          listable
          opensAt=""
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
        />
      </PageBody>
    </>
  );
};

export default NewOpportunityPage;
