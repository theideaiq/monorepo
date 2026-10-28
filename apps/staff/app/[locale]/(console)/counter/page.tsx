import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { Counter } from "./_components/counter";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.counter");
  return { title: t("title") };
};

/** The counter: The IDEA Pass checks in person (support). */
const CounterPage = async () => {
  const { canWrite } = await requireSection("counter");
  const t = await getTranslations("admin.counter");

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <Counter canCheckIn={canWrite} />
      </PageBody>
    </>
  );
};

export default CounterPage;
