import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { requireSection } from "@/lib/admin/session";
import { BulkCoverFinder } from "../_components/bulk-cover-finder";

/** At most this many products are looked up per visit (MusicBrainz: 1/s). */
const LIMIT = 100;

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.covers");
  return { title: t("title") };
};

const CoversPage = async () => {
  const { supabase } = await requireSection("catalog", "write");
  const t = await getTranslations("admin.catalog");
  const { data: products } = await supabase
    .from("products")
    .select("id, name_en, details, images, product_categories(slug)")
    // An empty array as a Postgres literal (supabase-js sends `[]` as an empty
    // string, which matches nothing).
    .filter("images", "eq", "{}")
    .neq("status", "archived")
    .order("created_at", { ascending: false })
    .limit(LIMIT);

  const rows = (products ?? []).map((product) => ({
    categorySlug: product.product_categories?.slug ?? null,
    details: product.details,
    id: product.id,
    images: product.images,
    name_en: product.name_en,
  }));

  return (
    <>
      <PageHeader
        back={{ href: "/catalog", label: t("title") }}
        title={t("covers.title")}
      />
      <PageBody className="max-w-5xl">
        <p className="max-w-3xl text-muted-foreground text-sm">
          {t("covers.description")}
        </p>
        {rows.length === 0 ? (
          <EmptyState title={t("covers.empty")} />
        ) : (
          <>
            {rows.length === LIMIT ? (
              <p className="text-muted-foreground text-sm">
                {t("covers.limited", { count: String(LIMIT) })}
              </p>
            ) : null}
            <BulkCoverFinder products={rows} />
          </>
        )}
      </PageBody>
    </>
  );
};

export default CoversPage;
