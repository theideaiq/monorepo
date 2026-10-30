import { categoryOptions, localized, variantName } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, PageHeader, Panel } from "@/components/admin/page";
import { env } from "@/env";
import { tierOptions } from "@/lib/admin/catalog";
import { isUuid } from "@/lib/admin/list";
import { ratingSummary } from "@/lib/admin/reviews";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { supplierOptions } from "@/lib/admin/suppliers";
import { CopiesPanel } from "../../_components/copies-panel";
import { CoverFinder } from "../../_components/cover-finder";
import { HouseAuctionPanel } from "../../_components/house-auction-panel";
import { HouseOffersPanel } from "../../_components/house-offers-panel";
import { HouseSalesPanel } from "../../_components/house-sales-panel";
import { LookupPanel } from "../../_components/lookup-panel";
import { ProductForm } from "../../_components/product-form";
import { RatingPanel } from "../../_components/rating-panel";
import { VariantForm } from "../../_components/variant-form";
import { deleteProduct } from "../../actions";

const LOOKUP_FAMILIES = new Set([
  "board-games",
  "books",
  "films",
  "games",
  "music",
  "trading-cards",
]);

const CREATOR_DETAILS = ["Artist", "Author", "Director", "Developer"];

/** The lookup family: the slug of the product's top-level category. */
const lookupFamily = (
  categories: readonly { id: string; parent_id: string | null; slug: string }[],
  categoryId: string | null
) => {
  let category = categories.find((item) => item.id === categoryId);
  for (let depth = 0; category?.parent_id && depth < 5; depth += 1) {
    const parentId = category.parent_id;
    category = categories.find((item) => item.id === parentId);
  }
  return category && LOOKUP_FAMILIES.has(category.slug) ? category.slug : null;
};

const lookupCreator = (details: Record<string, unknown>) => {
  const key = CREATOR_DETAILS.find((name) => typeof details[name] === "string");
  return key ? String(details[key]) : null;
};

/** The product's category slug, and what the Look up panel starts with (null outside its families). */
const lookupProps = (
  product: {
    category_id: string | null;
    details: unknown;
    external_ids: unknown;
    id: string;
    name_en: string;
  },
  variants: readonly { barcode: string | null }[] | null,
  allCategories:
    | readonly { id: string; parent_id: string | null; slug: string }[]
    | null
) => {
  const categories = allCategories ?? [];
  const categorySlug =
    categories.find((category) => category.id === product.category_id)?.slug ??
    null;
  const family = lookupFamily(categories, product.category_id);
  if (!family) {
    return { categorySlug, panel: null };
  }
  const [only] = variants ?? [];
  return {
    categorySlug,
    panel: {
      barcode: variants?.length === 1 ? (only?.barcode ?? null) : null,
      creator: lookupCreator(
        (product.details ?? {}) as Record<string, unknown>
      ),
      family,
      linked: (product.external_ids ?? {}) as Record<string, unknown>,
      productId: product.id,
      title: product.name_en,
    },
  };
};

interface ProductPageProps {
  readonly params: Promise<{ id: string }>;
}

const ProductPage = async ({ params }: ProductPageProps) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("catalog");
  const locale = await getLocale();
  const t = await getTranslations("admin.catalog");
  const tCommon = await getTranslations("admin.common");

  const [
    { data: product },
    { data: variants },
    { data: categories },
    { data: plans },
    { data: reviews },
    { data: copies },
    suppliers,
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("product_variants")
      .select("*")
      .eq("product_id", id)
      .order("position"),
    supabase
      .from("product_categories")
      .select("id, slug, name_ar, name_en, parent_id")
      .order("position"),
    supabase
      .from("plans")
      .select("name, audience, tier")
      .eq("audience", "plus")
      .is("student_of", null)
      .order("position"),
    supabase
      .from("product_reviews")
      .select("rating, status")
      .eq("product_id", id)
      .limit(10_000),
    supabase
      .from("stock_items")
      .select("*")
      .eq("product_id", id)
      .order("status")
      .order("created_at", { ascending: false })
      .limit(500),
    supplierOptions(supabase, t("copies.house")),
  ]);

  if (!product) {
    notFound();
  }
  const lookup = lookupProps(product, variants, categories);
  const variantOptions = (variants ?? []).map((variant, index) => ({
    id: variant.id,
    label:
      variantName(variant, locale) ||
      variant.sku ||
      t("copies.variantNumber", {
        number: formatNumber(index + 1, locale as Locale),
      }),
  }));

  return (
    <>
      <PageHeader
        back={{ href: "/catalog", label: t("title") }}
        description={product.slug}
        title={localized(product, "name", locale)}
      >
        {canWrite ? (
          <ActionButton
            action={deleteProduct}
            confirm={{
              description: t("products.deleteDescription"),
              title: tCommon("deleteConfirm"),
            }}
            fields={{ id: product.id }}
            variant="destructive"
          >
            {tCommon("delete")}
          </ActionButton>
        ) : null}
      </PageHeader>
      <PageBody className="max-w-5xl">
        {canWrite ? (
          <>
            <CoverFinder categorySlug={lookup.categorySlug} product={product} />
            {lookup.panel ? (
              <LookupPanel {...lookup.panel} key={product.updated_at} />
            ) : null}
          </>
        ) : null}
        {/* A new key after each save (e.g. a cover found above) reloads the images. */}
        <ProductForm
          categories={categoryOptions(categories ?? [], locale)}
          disabled={!canWrite}
          key={product.updated_at}
          product={product}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
          tiers={tierOptions(plans ?? [])}
          variantPriced={(variants ?? []).length > 1}
        />
        <CopiesPanel
          copies={copies ?? []}
          disabled={!canWrite}
          product={product}
          suppliers={suppliers}
          variants={variantOptions}
        />
        <HouseOffersPanel
          copies={copies ?? []}
          disabled={!canWrite}
          supabase={supabase}
          variants={variantOptions}
        />
        <HouseAuctionPanel
          copies={copies ?? []}
          disabled={!canWrite}
          supabaseUrl={env.NEXT_PUBLIC_SUPABASE_URL ?? ""}
          variants={variantOptions}
        />
        <HouseSalesPanel
          copies={copies ?? []}
          disabled={!canWrite}
          supabase={supabase}
          variants={variantOptions}
        />
        <RatingPanel
          productId={product.id}
          showReviews={canRead(staff.role, "reviews")}
          summary={ratingSummary(reviews ?? [])}
        />
        <Panel
          description={t("variants.description")}
          title={t("variants.title")}
        >
          {(variants ?? []).map((variant) => (
            <VariantForm
              disabled={!canWrite}
              key={`${variant.id}-${variant.created_at}`}
              productId={product.id}
              variant={variant}
            />
          ))}
          {canWrite ? (
            // A new key after each added variant clears the form.
            <VariantForm
              key={`new-${variants?.length ?? 0}`}
              productId={product.id}
            />
          ) : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default ProductPage;
