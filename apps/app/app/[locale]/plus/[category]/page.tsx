import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { MoveLeft } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlusSurface } from "@/components/plus/plus-surface";
import { CatalogueGrid } from "@/components/store/catalogue-grid";
import {
  getCategories,
  getFormats,
  getPlusAvailability,
  getProducts,
} from "@/lib/data";
import { localizedMetadata } from "@/lib/metadata";
import {
  gridFilters,
  parseStoreQuery,
  STORE_PAGE_SIZE,
} from "@/lib/store-params";

interface PlusShelfProps {
  params: Promise<{ category: string; locale: Locale }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** A top-level category with products in Plus, by its slug. */
const plusCategory = async (slug: string) => {
  const categories = await getCategories("rental");
  const category = categories.find(
    (row) => !row.parent_id && row.slug === slug
  );
  return category
    ? {
        category,
        subcategories: categories.filter(
          (row) => row.parent_id === category.id
        ),
      }
    : null;
};

export const generateMetadata = async ({
  params,
}: PlusShelfProps): Promise<Metadata> => {
  const { category: slug, locale } = await params;
  const found = await plusCategory(slug);
  if (!found) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.plus.shelf" });
  const name = localized(found.category, "name", locale);
  return localizedMetadata(locale, `/plus/${slug}`, {
    description: t("description", { category: name }),
    title: t("title", { category: name }),
  });
};

/** `/plus/<category>`: the category's products in Plus, with availability. */
const PlusShelfPage = async ({ params, searchParams }: PlusShelfProps) => {
  const { category: slug, locale } = await params;
  setRequestLocale(locale);
  const found = await plusCategory(slug);
  if (!found) {
    notFound();
  }
  const query = parseStoreQuery(await searchParams);
  const t = await getTranslations({ locale, namespace: "web.plus.shelf" });
  const [formats, rows] = await Promise.all([
    getFormats(),
    getProducts({ ...gridFilters(query, slug), kind: "rental" }),
  ]);
  const products = rows.slice(0, STORE_PAGE_SIZE);
  const availability = await getPlusAvailability(
    products.map((product) => product.id)
  );
  const name = localized(found.category, "name", locale);

  return (
    <PlusSurface>
      <div className="container mx-auto flex flex-col gap-3 px-4 pt-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/plus"
        >
          <MoveLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
          {t("back")}
        </Link>
        <h1 className="font-bold text-2xl tracking-tight md:text-3xl">
          {t("title", { category: name })}
        </h1>
      </div>
      <CatalogueGrid
        availability={availability}
        basePath={`/plus/${slug}`}
        formats={formats}
        hasNext={rows.length > STORE_PAGE_SIZE}
        locale={locale}
        plusFilter={false}
        products={products}
        query={query}
        subcategories={found.subcategories}
        title={t("all", { category: name })}
      />
    </PlusSurface>
  );
};

export default PlusShelfPage;
