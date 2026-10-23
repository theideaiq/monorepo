/**
 * Catalog queries. Each takes the caller's Supabase client (anonymous,
 * signed-in or staff), so Row Level Security decides what comes back: the
 * public sees active products only.
 */
import type { Database, ProductKind, Tables } from "@repo/database";
import { publicFileUrl } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

const LIKE_WILDCARDS = /[%_\\]/g;

export const PRODUCT_CARD_COLUMNS =
  "id, slug, kind, name_ar, name_en, price, compare_at_price, currency, condition, stock_count, images, featured, category_id" as const;

export type ProductCard = Pick<
  Tables<"products">,
  | "category_id"
  | "compare_at_price"
  | "condition"
  | "currency"
  | "featured"
  | "id"
  | "images"
  | "kind"
  | "name_ar"
  | "name_en"
  | "price"
  | "slug"
  | "stock_count"
>;

export type ProductDetail = Tables<"products"> & {
  category: Pick<
    Tables<"product_categories">,
    "id" | "name_ar" | "name_en" | "slug"
  > | null;
  product_variants: Tables<"product_variants">[];
};

const unwrap = <T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}) => {
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

export interface ProductFilters {
  /** Category slug. */
  category?: string;
  featured?: boolean;
  kind?: ProductKind;
  limit?: number;
  offset?: number;
  /** Matches the Arabic or English name. */
  search?: string;
  sort?: "newest" | "price-asc" | "price-desc";
}

export const listCategories = async (supabase: Client, kind?: ProductKind) => {
  let query = supabase
    .from("product_categories")
    .select("id, slug, name_ar, name_en, kind, position")
    .order("position");
  if (kind) {
    query = query.eq("kind", kind);
  }
  return unwrap(await query);
};

export const listProducts = async (
  supabase: Client,
  {
    category,
    featured,
    kind = "sale",
    limit = 24,
    offset = 0,
    search,
    sort = "newest",
  }: ProductFilters = {}
): Promise<ProductCard[]> => {
  let query = supabase
    .from("products")
    .select(
      category
        ? `${PRODUCT_CARD_COLUMNS}, product_categories!inner (slug)`
        : PRODUCT_CARD_COLUMNS
    )
    .eq("status", "active")
    .eq("kind", kind);

  if (category) {
    query = query.eq("product_categories.slug", category);
  }
  if (featured) {
    query = query.eq("featured", true);
  }
  if (search?.trim()) {
    const pattern = `%${search.trim().replace(LIKE_WILDCARDS, "\\$&")}%`;
    query = query.or(
      `name_ar.ilike.${JSON.stringify(pattern)},name_en.ilike.${JSON.stringify(pattern)}`
    );
  }

  query =
    sort === "newest"
      ? query.order("created_at", { ascending: false })
      : query.order("price", { ascending: sort === "price-asc" });

  const rows = unwrap(await query.range(offset, offset + limit - 1));
  return (
    rows as unknown as (ProductCard & { product_categories?: unknown })[]
  ).map(({ product_categories: _category, ...product }) => product);
};

export const getProductBySlug = async (
  supabase: Client,
  slug: string
): Promise<ProductDetail | null> => {
  const row = unwrap(
    await supabase
      .from("products")
      .select(
        "*, category:product_categories (id, slug, name_ar, name_en), product_variants (*)"
      )
      .eq("slug", slug)
      .order("position", { referencedTable: "product_variants" })
      .maybeSingle()
  );
  return row as ProductDetail | null;
};

export const getStoreSettings = async (supabase: Client) => {
  const row = unwrap(
    await supabase
      .from("store_settings")
      .select("shipping_fee, free_shipping_threshold")
      .single()
  ) as Pick<
    Tables<"store_settings">,
    "free_shipping_threshold" | "shipping_fee"
  >;
  return {
    freeShippingThreshold: row.free_shipping_threshold,
    shippingFee: row.shipping_fee,
  };
};

/** Public URL of a product image stored in the `catalog` bucket. */
export const productImageUrl = (supabaseUrl: string, path: string) =>
  path.startsWith("https://")
    ? path
    : publicFileUrl(supabaseUrl, "catalog", path);
