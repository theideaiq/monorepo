import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { PlanForm } from "../../_components/plan-form";

const PlanPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", decodeURIComponent(id))
    .maybeSingle();

  if (!plan) {
    notFound();
  }

  return (
    <>
      <PageHeader
        back={{ href: "/plus/plans", label: t("tabs.plans") }}
        description={plan.id}
        title={plan.name}
      />
      <PageBody className="max-w-4xl">
        <PlanForm disabled={!canWrite} plan={plan} />
      </PageBody>
    </>
  );
};

export default PlanPage;
