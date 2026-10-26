import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { CategoryForm } from "../_components/category-form";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("categories") };
};

const CategoriesPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const { data: categories } = await supabase
    .from("product_categories")
    .select("*")
    .order("position");

  return (
    <>
      <PageHeader title={t("title")} />
      <CatalogTabs />
      <PageBody>
        <Panel
          description={t("categories.description")}
          title={t("tabs.categories")}
        >
          {(categories ?? []).map((category) => (
            <CategoryForm
              category={category}
              disabled={!canWrite}
              key={category.id}
            />
          ))}
        </Panel>
        {canWrite ? (
          <Panel title={t("categories.new")}>
            <CategoryForm key={`new-${categories?.length ?? 0}`} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default CategoriesPage;
