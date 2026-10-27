import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { PlanForm } from "../../_components/plan-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.plans");
  return { title: t("new") };
};

const NewPlanPage = async () => {
  await requireSection("catalog", "write");
  const t = await getTranslations("admin.catalog");

  return (
    <>
      <PageHeader
        back={{ href: "/catalog/plans", label: t("tabs.plans") }}
        title={t("plans.new")}
      />
      <PageBody className="max-w-4xl">
        <PlanForm />
      </PageBody>
    </>
  );
};

export default NewPlanPage;
