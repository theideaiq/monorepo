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
  "id, slug, kind, name_ar, name_en, price, compare_at_price, currency, condition, stock_count, images, featured, category_id, variants:product_variants (id, label_ar, label_en, attributes, price, active, position)" as const;

/** What a card shows of a variant: its name (format chips) and price ("from"). */
export type CardVariant = Pick<
  Tables<"product_variants">,
  | "active"
  | "attributes"
  | "id"
  | "label_ar"
  | "label_en"
  | "position"
  | "price"
>;

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
> & {
  /** Its variants (live or hidden; see `liveVariants`). */
  variants: CardVariant[];
};

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
  /** Products with a live variant in this format (`attributes.Format`). */
  format?: string;
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
    format,
    kind = "sale",
    limit = 24,
    offset = 0,
    search,
    sort = "newest",
  }: ProductFilters = {}
): Promise<ProductCard[]> => {
  const term = search?.trim().slice(0, SEARCH_MAX_LENGTH);
  // A format filter joins the live variants in that format.
  const formatJoin = format ? ", format:product_variants!inner (id)" : "";
  if (term) {
    let ranked = supabase
      .rpc("search_products", {
        search_category: category,
        search_kind: kind,
        search_term: term,
      })
      .select(`${PRODUCT_CARD_COLUMNS}${formatJoin}`);
    if (featured) {
      ranked = ranked.eq("featured", true);
    }
    if (format) {
      ranked = ranked
        .eq("format.attributes->>Format", format)
        .eq("format.active", true);
    }
    if (sort !== "newest") {
      ranked = ranked.order("price", { ascending: sort === "price-asc" });
    }
    return withoutJoins(
      unwrap(await ranked.range(offset, offset + limit - 1)) as unknown[]
    );
  }

  let query = supabase
    .from("products")
    .select(
      `${PRODUCT_CARD_COLUMNS}${
        category ? ", product_categories!inner (slug)" : ""
      }${formatJoin}`
    )
    .eq("status", "active")
    .eq("kind", kind);

  if (category) {
    query = query.eq("product_categories.slug", category);
  }
  if (format) {
    query = query
      .eq("format.attributes->>Format", format)
      .eq("format.active", true);
  }
  if (featured) {
    query = query.eq("featured", true);
  }

  query =
    sort === "newest"
      ? query.order("created_at", { ascending: false })
      : query.order("price", { ascending: sort === "price-asc" });

  return withoutJoins(
    unwrap(await query.range(offset, offset + limit - 1)) as unknown[]
  );
};

/** Cards without the rows joined only to filter (category, format). */
const withoutJoins = (rows: unknown[]): ProductCard[] =>
  (
    rows as (ProductCard & { format?: unknown; product_categories?: unknown })[]
  ).map(
    ({ format: _format, product_categories: _category, ...product }) => product
  );

/**
 * The formats on sale (`attributes.Format` of live variants of live
 * products of a kind), for the store's format filter, A to Z.
 */
export const listFormats = async (
  supabase: Client,
  kind: ProductKind = "sale"
): Promise<string[]> => {
  const rows = unwrap(
    await supabase
      .from("product_variants")
      .select("attributes, product:products!inner (status, kind)")
      .eq("active", true)
      .eq("product.status", "active")
      .eq("product.kind", kind)
      .not("attributes->>Format", "is", null)
      .limit(5000)
  ) as { attributes: unknown }[];
  const formats = new Set<string>();
  for (const { attributes } of rows) {
    const value = (attributes as Record<string, unknown> | null)?.Format;
    if (typeof value === "string" && value.trim()) {
      formats.add(value.trim());
    }
  }
  return [...formats].sort((a, b) => a.localeCompare(b));
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

/**
 * What a product can be had as: its available copies by variant, condition
 * and purpose (for sale or for rent), with the lowest price for sale.
 */
export interface ProductOffer {
  available: number;
  condition: Tables<"products">["condition"];
  /** Lowest sale price; null for copies for rent. */
  price: number | null;
  purpose: "rental" | "sale";
  variant_id: string | null;
}

export const getProductOffers = async (
  supabase: Client,
  productId: string
): Promise<ProductOffer[]> => {
  const rows =
    unwrap(
      await supabase.rpc("product_offers", { offer_product: productId })
    ) ?? [];
  // The generated types can't tell that a variant or a price may be null.
  return rows.flatMap((row) =>
    row.purpose === "business"
      ? []
      : [
          {
            available: row.available,
            condition: row.condition,
            price: (row.price as number | null) ?? null,
            purpose: row.purpose,
            variant_id: (row.variant_id as string | null) ?? null,
          },
        ]
  );
};

/**
 * The same work in other formats (vinyl, CD, cassette; PS5, Xbox):
 * active products sharing the product's `group_key`.
 */
export const listOtherFormats = async (
  supabase: Client,
  product: Pick<Tables<"products">, "group_key" | "id">
): Promise<ProductCard[]> => {
  if (!product.group_key) {
    return [];
  }
  return unwrap(
    await supabase
      .from("products")
      .select(PRODUCT_CARD_COLUMNS)
      .eq("group_key", product.group_key)
      .eq("status", "active")
      .neq("id", product.id)
      .order("name_en")
      .limit(8)
  ) as ProductCard[];
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
  | "carrier_province"
  | "fee"
  | "governorate"
  | "id"
  | "max_days"
  | "min_days"
  | "name_ar"
  | "name_en"
>;

/** The zones customers can choose at checkout, in the store's order. */
export const listDeliveryZones = async (
  supabase: Client
): Promise<DeliveryZone[]> =>
  unwrap(
    await supabase
      .from("delivery_zones")
      .select(
        "id, governorate, carrier_province, name_ar, name_en, fee, min_days, max_days"
      )
      .eq("active", true)
      .order("position")
      .order("name_en")
  ) ?? [];

/**
 * The courier's areas in a province (Boxy's names, which it matches the
 * address by), A to Z, for the checkout's area picker. Empty until the
 * sync job has copied them, or for a province without any.
 */
export const listDeliveryAreas = async (
  supabase: Client,
  province: string
): Promise<string[]> =>
  (
    unwrap(
      await supabase
        .from("delivery_areas")
        .select("name")
        .eq("province", province)
        .order("name")
        .limit(5000)
    ) ?? []
  ).map((area) => area.name);

/** Public URL of a product image stored in the `catalog` bucket. */
export const productImageUrl = (supabaseUrl: string, path: string) =>
  path.startsWith("https://")
    ? path
    : publicFileUrl(supabaseUrl, "catalog", path);
