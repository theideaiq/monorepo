import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { RouteForm } from "../_components/route-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.travel");
  return { title: t("new") };
};

/** A new Travel Kit route, a draft until it has been checked. */
const NewTravelRoutePage = async () => {
  await requireSection("editorial", "write");
  const t = await getTranslations("admin.editorial");

  return (
    <>
      <PageHeader
        back={{ href: "/club/travel", label: t("tabs.travel") }}
        title={t("travel.new")}
      />
      <PageBody className="max-w-5xl">
        <RouteForm />
      </PageBody>
    </>
  );
};

export default NewTravelRoutePage;
