import {
  getProductBySlug,
  getProductOffers,
  listCategories,
  listFormats,
  listProducts,
  PRODUCT_CARD_COLUMNS,
  type ProductCard,
  type ProductFilters,
  type ProductOffer,
  productImageUrl,
} from "@repo/commerce/catalog";
import type { Enums, Tables } from "@repo/database";
import { log } from "@repo/observability/log";
import { publicFileUrl } from "@repo/storage";
import { type Rating, type Review, ratingsById } from "./reviews";
import { createPublicClient, supabaseUrl } from "./supabase";

/**
 * Public data for the website, read with the anonymous client so Row Level
 * Security decides what is visible. List queries degrade to empty results
 * (logged) when Supabase is unreachable, so a page can still render; detail
 * queries return null for missing rows and throw on other failures.
 */

const fallback = async <T>(label: string, empty: T, run: () => Promise<T>) => {
  try {
    return await run();
  } catch (error) {
    log.error(`web: ${label} failed: ${String(error)}`);
    return empty;
  }
};

const check = <T>({
  data,
  error,
}: {
  data: T;
  error: { message: string } | null;
}): T => {
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

/** Rows of a list query (never null). */
const rows = <T>(result: {
  data: T[] | null;
  error: { message: string } | null;
}): T[] => check(result) ?? [];

/**
 * An `or` filter matching `term` in the Arabic or English title, or null
 * for an empty term. Characters with a meaning in PostgREST filters (`,`
 * `(` `)` `"` `\\` `:`) and in LIKE patterns (`%` `_` `*`) are dropped.
 */
export const titleSearch = (term: string | undefined) => {
  const clean = term
    ?.replace(/[,()"\\:%_*]/g, " ")
    .trim()
    .slice(0, 100);
  return clean ? `title_ar.ilike.*${clean}*,title_en.ilike.*${clean}*` : null;
};

// ── Catalog ─────────────────────────────────────────────────────────────────

export type {
  ProductCard,
  ProductDetail,
  ProductOffer,
} from "@repo/commerce/catalog";

export const getProducts = (filters: ProductFilters) =>
  fallback("listProducts", [] as ProductCard[], async () => {
    const supabase = createPublicClient();
    return supabase ? await listProducts(supabase, filters) : [];
  });

export type Category = NonNullable<
  Awaited<ReturnType<typeof listCategories>>
>[number];

export const getCategories = (kind: "sale" | "rental" = "sale") =>
  fallback("listCategories", [] as Category[], async () => {
    const supabase = createPublicClient();
    return supabase ? ((await listCategories(supabase, kind)) ?? []) : [];
  });

export const getProduct = async (slug: string) => {
  const supabase = createPublicClient();
  return supabase ? await getProductBySlug(supabase, slug) : null;
};

/** The formats on sale (CD, Vinyl, …), for the store's format filter. */
export const getFormats = () =>
  fallback("listFormats", [] as string[], async () => {
    const supabase = createPublicClient();
    return supabase ? await listFormats(supabase) : [];
  });

/** The copies a product is on offer as (new, used, for rent…). */
export const getOffers = (productId: string) =>
  fallback("productOffers", [] as ProductOffer[], async () => {
    const supabase = createPublicClient();
    return supabase ? await getProductOffers(supabase, productId) : [];
  });

/** Slugs of every active product, for the sitemap and static params. */
export const getProductSlugs = () =>
  fallback(
    "productSlugs",
    [] as { slug: string; updated_at: string }[],
    async () => {
      const supabase = createPublicClient();
      if (!supabase) {
        return [];
      }
      return rows(
        await supabase
          .from("products")
          .select("slug, updated_at")
          .eq("status", "active")
          .order("updated_at", { ascending: false })
          .limit(5000)
      );
    }
  );

export type RentalCard = ProductCard & Pick<Tables<"products">, "rental_tier">;

/** Newest rentable products, with the plan tier each one needs. */
export const getRentals = (limit = 8) =>
  fallback("rentals", [] as RentalCard[], async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return [];
    }
    return rows(
      await supabase
        .from("products")
        .select(`${PRODUCT_CARD_COLUMNS}, rental_tier`)
        .eq("status", "active")
        .eq("rentable", true)
        .order("created_at", { ascending: false })
        .limit(limit)
    );
  });

/** The plan tier each of these rental items needs, keyed by product id. */
export const getRentalTiers = (productIds: string[]) =>
  fallback("rentalTiers", {} as Record<string, number | null>, async () => {
    const supabase = productIds.length > 0 ? createPublicClient() : null;
    if (!supabase) {
      return {};
    }
    const tiers = rows(
      await supabase
        .from("products")
        .select("id, rental_tier")
        .in("id", productIds)
    );
    return Object.fromEntries(tiers.map((row) => [row.id, row.rental_tier]));
  });

// ── Reviews ─────────────────────────────────────────────────────────────────

/**
 * Ratings of the given products in one query (`product_ratings`), keyed by
 * product id. Products without published reviews are missing from the map.
 */
export const getRatings = (productIds: string[]) =>
  fallback("product_ratings", {} as Record<string, Rating>, async () => {
    const ids = [...new Set(productIds)];
    const supabase = ids.length > 0 ? createPublicClient() : null;
    if (!supabase) {
      return {};
    }
    return ratingsById(
      rows(
        await supabase
          .from("product_ratings")
          .select("product_id, average, count")
          .in("product_id", ids)
      )
    );
  });

/** The latest published reviews of a product, newest first. */
export const getReviews = (productId: string, limit = 10) =>
  fallback("product_review_list", [] as Review[], async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return [];
    }
    return rows(
      await supabase.rpc("product_review_list", {
        max_rows: limit,
        review_product: productId,
      })
    ) as Review[];
  });

/** Public URL of a product image (storage path or absolute URL). */
export const imageUrl = (path: string | null | undefined) =>
  path && supabaseUrl() ? productImageUrl(supabaseUrl(), path) : null;

// ── Plans ───────────────────────────────────────────────────────────────────

export type Plan = Pick<
  Tables<"plans">,
  | "amount"
  | "billing_interval"
  | "currency"
  | "description"
  | "features_ar"
  | "features_en"
  | "id"
  | "name"
  | "name_ar"
  | "rental_slots"
  | "tier"
>;

export const getPlans = (audience: "business" | "plus") =>
  fallback("plans", [] as Plan[], async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return [];
    }
    return rows(
      await supabase
        .from("plans")
        .select(
          "id, name, name_ar, description, amount, currency, billing_interval, rental_slots, tier, features_ar, features_en"
        )
        .eq("active", true)
        .eq("audience", audience)
        .is("student_of", null)
        .order("position")
    );
  });

/** Game night kits on offer, for The IDEA Plus page. */
export const getKitTypes = () =>
  fallback(
    "kits",
    [] as {
      deposit: number;
      description_ar: string;
      description_en: string;
      extra_day_price: number;
      id: string;
      name_ar: string;
      name_en: string;
      price: number;
    }[],
    async () => {
      const supabase = createPublicClient();
      if (!supabase) {
        return [];
      }
      return rows(
        await supabase
          .from("kit_types")
          .select(
            "id, name_ar, name_en, description_ar, description_en, price, extra_day_price, deposit"
          )
          .eq("active", true)
          .order("position")
      );
    }
  );

// ── Editorial ───────────────────────────────────────────────────────────────

/** Public URL of a cover image in the `editorial` bucket. */
export const editorialUrl = (path: string | null | undefined) => {
  if (!path) {
    return null;
  }
  if (path.startsWith("https://")) {
    return path;
  }
  return supabaseUrl() ? publicFileUrl(supabaseUrl(), "editorial", path) : null;
};

const POST_SUMMARY =
  "id, slug, topics, byline, title_ar, title_en, excerpt_ar, excerpt_en, cover_image, published_at, updated_at" as const;

export type PostSummary = Pick<
  Tables<"posts">,
  | "byline"
  | "cover_image"
  | "excerpt_ar"
  | "excerpt_en"
  | "id"
  | "published_at"
  | "slug"
  | "title_ar"
  | "title_en"
  | "topics"
  | "updated_at"
>;

/** Published posts of The IDEA Club, newest first (one topic or all). */
export const getPosts = ({
  limit = 24,
  search,
  topic,
}: {
  limit?: number;
  /** Only posts with this in their title. */
  search?: string;
  /** Only posts tagged with this topic (all when missing). */
  topic?: Enums<"post_topic">;
} = {}) =>
  fallback("posts", [] as PostSummary[], async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return [];
    }
    let query = supabase
      .from("posts")
      .select(POST_SUMMARY)
      .not("published_at", "is", null)
      .lte("published_at", new Date().toISOString());
    if (topic) {
      query = query.contains("topics", [topic]);
    }
    const titled = titleSearch(search);
    if (titled) {
      query = query.or(titled);
    }
    return rows(
      await query.order("published_at", { ascending: false }).limit(limit)
    );
  });

export const getPost = async (slug: string) => {
  const supabase = createPublicClient();
  if (!supabase) {
    return null;
  }
  return check(
    await supabase
      .from("posts")
      .select(
        "id, slug, topics, byline, title_ar, title_en, excerpt_ar, excerpt_en, body_ar, body_en, cover_image, published_at, updated_at"
      )
      .eq("slug", slug)
      .not("published_at", "is", null)
      .maybeSingle()
  );
};

const EVENT_COLUMNS =
  "id, slug, title_ar, title_en, description_ar, description_en, location, starts_at, ends_at, cover_image, capacity, updated_at" as const;

export type EventRow = Pick<
  Tables<"events">,
  | "capacity"
  | "cover_image"
  | "description_ar"
  | "description_en"
  | "ends_at"
  | "id"
  | "location"
  | "slug"
  | "starts_at"
  | "title_ar"
  | "title_en"
  | "updated_at"
>;

/** Published events that haven't ended (or past ones with `past`). */
export const getEvents = ({
  limit = 24,
  past = false,
  search,
}: {
  limit?: number;
  past?: boolean;
  /** Only events with this in their title. */
  search?: string;
} = {}) =>
  fallback("events", [] as EventRow[], async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return [];
    }
    const now = new Date().toISOString();
    let query = supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("published", true);
    const titled = titleSearch(search);
    if (titled) {
      query = query.or(titled);
    }
    return rows(
      await (past
        ? query.lt("starts_at", now).order("starts_at", { ascending: false })
        : query.gte("starts_at", now).order("starts_at", { ascending: true })
      ).limit(limit)
    );
  });

export const getEvent = async (slug: string) => {
  const supabase = createPublicClient();
  if (!supabase) {
    return null;
  }
  return check(
    await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle()
  );
};

/** How many people RSVP'd, without revealing who (`event_rsvp_count`). */
export const getRsvpCount = (eventId: string) =>
  fallback("event_rsvp_count", null as number | null, async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return null;
    }
    return Number(
      check(await supabase.rpc("event_rsvp_count", { event: eventId }))
    );
  });

// ── Invites ─────────────────────────────────────────────────────────────────

/**
 * What /r/<code> is: a member's invite code or nothing (null), from
 * `referral_kind()`.
 */
export const getReferralKind = (code: string) =>
  fallback("referral_kind", null as "invite" | null, async () => {
    const supabase = createPublicClient();
    if (!supabase) {
      return null;
    }
    const kind = check(await supabase.rpc("referral_kind", { code }));
    return kind === "invite" ? kind : null;
  });
