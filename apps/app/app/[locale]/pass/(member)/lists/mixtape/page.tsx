import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/page-header";
import { Mixtape } from "@/components/saved/mixtape";
import { titleFrom } from "@/lib/app-metadata";

export const generateMetadata = titleFrom((t) => t("app.mixtape.title"));

/** `/pass/lists/mixtape` (A7): build a list of records to share. */
const MixtapePage = async () => {
  const t = await getTranslations("app.mixtape");
  return (
    <>
      <PageHeader title={t("title")} />
      <Mixtape />
    </>
  );
};

export default MixtapePage;
