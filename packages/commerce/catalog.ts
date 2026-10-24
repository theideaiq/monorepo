/**
 * Catalog queries. Each takes the caller's Supabase client (anonymous,
 * signed-in or staff), so Row Level Security decides what comes back: the
 * public sees active products only.
 */
import type { Database, ProductKind, Tables } from "@repo/database";
import { publicFileUrl } from "@repo/storage";
import type { SupabaseClient } from "@supabase/supabase-js";

type Client = SupabaseClient<Database>;

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
  /** Arabic or English search (see `listProducts`). */
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

/** Longest search term sent to the database (the store's ?q= is cut there too). */
const SEARCH_MAX_LENGTH = 100;

/**
 * Store listing. With `search`, products come from the `search_products`
 * RPC: Arabic and English names, descriptions and specifications (artist,
 * author, …), normalized (no tashkeel, أ/إ/آ → ا, ى → ي, ة → ه) and ranked
 * best match first. The default sort ("newest") keeps that ranking; the
 * price sorts reorder it.
 */
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
  const term = search?.trim().slice(0, SEARCH_MAX_LENGTH);
  if (term) {
    let ranked = supabase
      .rpc("search_products", {
        search_category: category,
        search_kind: kind,
        search_term: term,
      })
      .select(PRODUCT_CARD_COLUMNS);
    if (featured) {
      ranked = ranked.eq("featured", true);
    }
    if (sort !== "newest") {
      ranked = ranked.order("price", { ascending: sort === "price-asc" });
    }
    return unwrap(
      await ranked.range(offset, offset + limit - 1)
    ) as unknown as ProductCard[];
  }

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
