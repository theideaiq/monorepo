import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { crmStaff } from "@/lib/admin/partner-crm-staff";
import { requireSection } from "@/lib/admin/session";
import { OrgForm } from "../_components/org-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.partnerCrm");
  return { title: t("new") };
};

/** A new partner organization, owned by whoever adds it unless changed. */
const NewPartnerOrgPage = async () => {
  const { staff, supabase } = await requireSection("partnerCrm", "write");
  const t = await getTranslations("admin.partnerCrm");
  const tNav = await getTranslations("admin.nav");
  const team = await crmStaff(supabase);

  return (
    <>
      <PageHeader
        back={{ href: "/partners/crm", label: tNav("partnerCrm") }}
        title={t("new")}
      />
      <PageBody className="max-w-5xl">
        <OrgForm defaultOwner={staff.userId} staff={team} />
      </PageBody>
    </>
  );
};

export default NewPartnerOrgPage;
