import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { IMPORT_COLUMNS } from "@/lib/admin/catalog-import";
import { requireSection } from "@/lib/admin/session";
import { ImportPanel } from "../_components/import-panel";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.import");
  return { title: t("title") };
};

const ImportPage = async () => {
  const { supabase } = await requireSection("catalog", "write");
  const t = await getTranslations("admin.catalog");
  const { data: categories } = await supabase
    .from("product_categories")
    .select("id, slug")
    .order("position");

  return (
    <>
      <PageHeader
        back={{ href: "/catalog", label: t("title") }}
        title={t("import.title")}
      />
      <PageBody className="max-w-6xl">
        <ImportPanel categories={categories ?? []} />
        <Panel
          description={t("import.columnsDescription")}
          title={t("import.columnsTitle")}
        >
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
            {IMPORT_COLUMNS.map((column) => (
              <div className="contents" key={column}>
                <dt className="font-medium font-mono" dir="ltr">
                  {column}
                </dt>
                <dd className="text-muted-foreground">
                  {t(`import.columns.${column}`)}
                </dd>
              </div>
            ))}
          </dl>
          <p className="text-muted-foreground text-sm">
            {t("import.detailsColumns")}
          </p>
        </Panel>
      </PageBody>
    </>
  );
};

export default ImportPage;
