import { categoryOptions, localized } from "@repo/commerce";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
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
  const locale = await getLocale();
  const { data } = await supabase
    .from("product_categories")
    .select("*")
    .order("position");
  const rows = data ?? [];
  // Each top-level category, then its subcategories.
  const categories = categoryOptions(rows, locale).flatMap(
    (option) => rows.find((row) => row.id === option.id) ?? []
  );
  // A category with subcategories can't move under another one.
  const parents = rows
    .filter((row) => !row.parent_id)
    .map((row) => ({ id: row.id, label: localized(row, "name", locale) }));

  return (
    <>
      <PageHeader title={t("title")} />
      <CatalogTabs />
      <PageBody>
        <Panel
          description={t("categories.description")}
          title={t("tabs.categories")}
        >
          {categories.map((category) => (
            <CategoryForm
              category={category}
              disabled={!canWrite}
              key={category.id}
              parents={
                rows.some((row) => row.parent_id === category.id) ? [] : parents
              }
            />
          ))}
        </Panel>
        {canWrite ? (
          <Panel title={t("categories.new")}>
            <CategoryForm key={`new-${rows.length}`} parents={parents} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default CategoriesPage;
