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

/** The store's counter, when customers may collect orders there. */
export interface PickupLocation {
  address_ar: string;
  address_en: string;
  hours_ar: string;
  hours_en: string;
}

type StoreSettingsRow = Pick<
  Tables<"store_settings">,
  | "cash_on_delivery_enabled"
  | "free_shipping_threshold"
  | "pickup_address_ar"
  | "pickup_address_en"
  | "pickup_enabled"
  | "pickup_hours_ar"
  | "pickup_hours_en"
  | "shipping_fee"
>;

/**
 * Delivery fees, the pickup location (null when pickup is off or has no
 * address) and whether cash payment is offered.
 */
export const getStoreSettings = async (supabase: Client) => {
  const row = unwrap(
    await supabase
      .from("store_settings")
      .select(
        "shipping_fee, free_shipping_threshold, pickup_enabled, pickup_address_ar, pickup_address_en, pickup_hours_ar, pickup_hours_en, cash_on_delivery_enabled"
      )
      .single()
  ) as Partial<StoreSettingsRow> &
    Pick<StoreSettingsRow, "free_shipping_threshold" | "shipping_fee">;
  const hasAddress = Boolean(
    row.pickup_address_ar?.trim() || row.pickup_address_en?.trim()
  );
  const pickup: PickupLocation | null =
    row.pickup_enabled && hasAddress
      ? {
          address_ar: row.pickup_address_ar ?? "",
          address_en: row.pickup_address_en ?? "",
          hours_ar: row.pickup_hours_ar ?? "",
          hours_en: row.pickup_hours_en ?? "",
        }
      : null;
  return {
    cashOnDelivery: row.cash_on_delivery_enabled ?? false,
    freeShippingThreshold: row.free_shipping_threshold,
    pickup,
    shippingFee: row.shipping_fee,
  };
};

export type DeliveryZone = Pick<
  Tables<"delivery_zones">,
  "fee" | "governorate" | "id" | "max_days" | "min_days" | "name_ar" | "name_en"
>;

/** The zones customers can choose at checkout, in the store's order. */
export const listDeliveryZones = async (
  supabase: Client
): Promise<DeliveryZone[]> =>
  unwrap(
    await supabase
      .from("delivery_zones")
      .select("id, governorate, name_ar, name_en, fee, min_days, max_days")
      .eq("active", true)
      .order("position")
      .order("name_en")
  ) ?? [];

/** Public URL of a product image stored in the `catalog` bucket. */
export const productImageUrl = (supabaseUrl: string, path: string) =>
  path.startsWith("https://")
    ? path
    : publicFileUrl(supabaseUrl, "catalog", path);
