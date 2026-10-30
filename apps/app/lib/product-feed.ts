import { localized } from "@repo/commerce";
import { type Locale, localePath } from "@repo/internationalization";

/**
 * The product feed (`/feeds/products.xml`): RSS 2.0 with Google's `g:`
 * fields, which Meta's Commerce Manager reads too. One item per product
 * for sale with a live version, with the product's id.
 * Google Merchant Center doesn't list Iraq yet, so today the feed is for
 * the Meta catalog (catalog ads on Facebook and Instagram).
 */

export interface FeedVariant {
  active: boolean;
  barcode: string | null;
  images: string[];
  price: number;
  stock_count: number;
}

export interface FeedProduct {
  category: { name_ar: string; name_en: string } | null;
  condition: "new" | "open_box" | "refurbished" | "used";
  currency: string;
  description_ar: string | null;
  description_en: string | null;
  details: unknown;
  id: string;
  images: string[];
  name_ar: string;
  name_en: string;
  slug: string;
  variants: FeedVariant[];
}

const FEED_CONDITIONS = {
  new: "new",
  open_box: "new",
  refurbished: "refurbished",
  used: "used",
} as const;

const BRAND_DETAILS = ["Brand", "Publisher", "Label", "Artist", "Author"];
const MAX_DESCRIPTION = 5000;
const XML_SPECIAL = /[<>&'"]/g;
const XML_ESCAPES: Record<string, string> = {
  "'": "&apos;",
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

// XML 1.0 has no place for control characters other than tab and newlines.
const isAllowed = (char: string) => {
  const code = char.charCodeAt(0);
  return code >= 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
};

export const escapeXml = (value: string) =>
  Array.from(value)
    .filter(isAllowed)
    .join("")
    .replace(XML_SPECIAL, (char) => XML_ESCAPES[char] ?? char);

const brandOf = (details: unknown) => {
  const record = (details ?? {}) as Record<string, unknown>;
  const key = BRAND_DETAILS.find(
    (name) => typeof record[name] === "string" && record[name]
  );
  return key ? String(record[key]) : "The IDEA";
};

const tag = (name: string, value: string | number | null | undefined) =>
  value === null || value === undefined || value === ""
    ? ""
    : `<${name}>${escapeXml(String(value))}</${name}>`;

interface FeedOptions {
  imageUrl: (path: string) => string | null;
  locale: Locale;
  siteUrl: string;
}

/**
 * A product's feed item, or null when no version is live. Its id is the
 * product's, the one the Meta Pixel sends as `content_ids`, so catalog ads
 * match views and purchases; the price is the lowest live version's.
 */
export const feedItem = (product: FeedProduct, options: FeedOptions) => {
  const { imageUrl, locale, siteUrl } = options;
  const live = product.variants.filter((variant) => variant.active);
  if (live.length === 0) {
    return null;
  }
  const name = localized(product, "name", locale);
  const description = (localized(product, "description", locale) || name).slice(
    0,
    MAX_DESCRIPTION
  );
  const price = Math.min(...live.map((variant) => variant.price));
  const inStock = live.some((variant) => variant.stock_count > 0);
  const [only] = live;
  const barcode = live.length === 1 ? only?.barcode : null;
  const images = [
    ...product.images,
    ...live.flatMap((variant) => variant.images),
  ]
    .map(imageUrl)
    .filter((url): url is string => Boolean(url));
  return [
    "<item>",
    tag("g:id", product.id),
    tag("g:title", name),
    tag("g:description", description),
    tag("g:link", `${siteUrl}${localePath(locale, `/store/${product.slug}`)}`),
    tag("g:image_link", images[0]),
    ...[...new Set(images.slice(1))]
      .slice(0, 10)
      .map((url) => tag("g:additional_image_link", url)),
    tag("g:availability", inStock ? "in_stock" : "out_of_stock"),
    tag("g:price", `${price} ${product.currency}`),
    tag("g:condition", FEED_CONDITIONS[product.condition]),
    tag("g:brand", brandOf(product.details)),
    barcode ? tag("g:gtin", barcode) : tag("g:identifier_exists", "no"),
    tag(
      "g:product_type",
      product.category ? localized(product.category, "name", locale) : null
    ),
    "</item>",
  ].join("");
};

/** The whole feed as XML. */
export const productFeedXml = (
  products: readonly FeedProduct[],
  options: FeedOptions & { title: string }
) =>
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>',
    tag("title", options.title),
    tag("link", `${options.siteUrl}${localePath(options.locale, "/store")}`),
    ...products
      .map((product) => feedItem(product, options))
      .filter((item): item is string => item !== null),
    "</channel></rss>",
  ].join("\n");
