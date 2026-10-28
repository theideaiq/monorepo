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
  "id, slug, kind, rentable, name_ar, name_en, price, compare_at_price, currency, condition, stock_count, images, featured, category_id, variants:product_variants (id, label_ar, label_en, attributes, price, active, position)" as const;

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
  | "rentable"
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

/**
 * The categories a tab lists, in their order: the shop's (with products
 * for sale) or, for `"rental"`, the Rent tab's (with rentable products).
 */
export const listCategories = async (
  supabase: Client,
  kind: ProductKind = "sale"
) =>
  unwrap(
    await supabase
      .rpc("listed_categories", { for_rent: kind === "rental" })
      .select("id, slug, name_ar, name_en, position")
  );

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
    .eq("status", "active");
  // The Rent tab lists every rentable product (rental items, and shop
  // products with copies for rent); the shop, products for sale.
  query =
    kind === "rental" ? query.eq("rentable", true) : query.eq("kind", kind);

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
 * The formats a tab offers (`attributes.Format` of live variants of live
 * products for sale, or rentable ones for `"rental"`), for the format
 * filter, A to Z.
 */
export const listFormats = async (
  supabase: Client,
  kind: ProductKind = "sale"
): Promise<string[]> => {
  const query = supabase
    .from("product_variants")
    .select("attributes, product:products!inner (status, kind, rentable)")
    .eq("active", true)
    .eq("product.status", "active")
    .not("attributes->>Format", "is", null)
    .limit(5000);
  const rows = unwrap(
    await (kind === "rental"
      ? query.eq("product.rentable", true)
      : query.eq("product.kind", kind))
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

export interface QuantityDeal {
  discount_rate: number;
  min_quantity: number;
}

/**
 * What a product can be had as: its available copies by variant, condition,
 * purpose (for sale or for rent) and seller (The IDEA or an approved shop),
 * with the lowest price for sale.
 */
export interface ProductOffer {
  available: number;
  condition: Tables<"products">["condition"];
  /** Quantity deals: a share off each copy from a quantity on. */
  deals: QuantityDeal[];
  /** Lowest price in the last 30 days, from price history; null for rent. */
  lowest_30d: number | null;
  /** Lowest sale price; null for copies for rent. */
  price: number | null;
  purpose: "rental" | "sale";
  /** When the running sale ends, or null. */
  sale_ends_at: string | null;
  seller_id: string;
  seller_name: string;
  variant_id: string | null;
  /** The honest "was" price (held 15 of the last 30 days), or null. */
  was_price: number | null;
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
            deals: (row.deals as QuantityDeal[] | null) ?? [],
            lowest_30d: (row.lowest_30d as number | null) ?? null,
            price: (row.price as number | null) ?? null,
            purpose: row.purpose,
            sale_ends_at: (row.sale_ends_at as string | null) ?? null,
            seller_id: row.seller_id,
            seller_name: row.seller_name,
            variant_id: (row.variant_id as string | null) ?? null,
            was_price: (row.was_price as number | null) ?? null,
          },
        ]
  );
};

/** The store's counter, when customers may collect orders there. */
/** One line of a shop's bundle: an item in it and how many. */
export interface BundleItem {
  label_ar: string | null;
  label_en: string | null;
  name_ar: string;
  name_en: string;
  quantity: number;
  slug: string;
}

interface BundleRow {
  quantity: number;
  variant: {
    label_ar: string | null;
    label_en: string | null;
    product: { name_ar: string; name_en: string; slug: string } | null;
  } | null;
}

/**
 * What a bundle holds, in order (`bundle_items`); empty for any other
 * product. Items whose product isn't visible are left out.
 */
export const getBundleItems = async (
  supabase: Client,
  productId: string
): Promise<BundleItem[]> => {
  const rows = (unwrap(
    await supabase
      .from("bundle_items")
      .select(
        "quantity, variant:product_variants (label_en, label_ar, product:products (slug, name_en, name_ar))"
      )
      .eq("bundle_id", productId)
      .order("position")
  ) ?? []) as unknown as BundleRow[];
  return rows.flatMap(({ quantity, variant }) =>
    variant?.product
      ? [
          {
            label_ar: variant.label_ar,
            label_en: variant.label_en,
            name_ar: variant.product.name_ar,
            name_en: variant.product.name_en,
            quantity,
            slug: variant.product.slug,
          },
        ]
      : []
  );
};

type StoreSettingsRow = Pick<
  Tables<"store_settings">,
  "cash_on_delivery_enabled" | "cash_limit" | "shipping_fee"
>;

/**
 * The default delivery fee and whether cash payment is offered.
 */
export const getStoreSettings = async (supabase: Client) => {
  const row = unwrap(
    await supabase
      .from("store_settings")
      .select("shipping_fee, cash_limit, cash_on_delivery_enabled")
      .single()
  ) as Partial<StoreSettingsRow> &
    Pick<StoreSettingsRow, "cash_limit" | "shipping_fee">;
  return {
    /** Above this subtotal, online payment only (null: no limit). */
    cashLimit: row.cash_limit,
    cashOnDelivery: row.cash_on_delivery_enabled ?? false,
    shippingFee: row.shipping_fee,
  };
};

export type DeliveryZone = Pick<
  Tables<"delivery_zones">,
  | "carrier_province"
  | "fee"
  | "free_from"
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
        "id, governorate, carrier_province, name_ar, name_en, fee, free_from, min_days, max_days"
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
