import { formatPrice, localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import { type BotLocale, t } from "./i18n";

export interface ProductSummary {
  kind: ProductCard["kind"];
  name: string;
  /** Formatted IQD price; null for rentals (included in The IDEA Plus). */
  price: string | null;
  /** "In stock: 3" or "Out of stock". */
  stock: string;
  url: string;
}

export const productUrl = (siteUrl: string, locale: BotLocale, slug: string) =>
  `${siteUrl}/${locale}/store/${encodeURIComponent(slug)}`;

export const summarizeProduct = (
  product: ProductCard,
  locale: BotLocale,
  siteUrl: string
): ProductSummary => ({
  kind: product.kind,
  name: localized(product, "name", locale),
  price: product.kind === "rental" ? null : formatPrice(product.price, locale),
  stock:
    product.stock_count > 0
      ? t(locale, "stock", { count: product.stock_count })
      : t(locale, "outOfStock"),
  url: productUrl(siteUrl, locale, product.slug),
});

const HTML_ESCAPES: Record<string, string> = {
  '"': "&quot;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

/** Escapes text for Telegram's HTML parse mode. */
export const escapeHtml = (text: string) =>
  text.replace(/[&<>"]/g, (character) => HTML_ESCAPES[character] ?? character);

/** One product as a Telegram HTML block. */
export const productHtml = (summary: ProductSummary, locale: BotLocale) =>
  [
    `<b>${escapeHtml(summary.name)}</b>`,
    [summary.price ?? t(locale, "rental"), summary.stock]
      .map(escapeHtml)
      .join(" · "),
    `<a href="${escapeHtml(summary.url)}">${escapeHtml(summary.url)}</a>`,
  ].join("\n");
