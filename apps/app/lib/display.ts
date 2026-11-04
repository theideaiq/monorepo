import type { ProductCard } from "@repo/commerce/catalog";

/**
 * Home's Music crate and Books shelf (`DisplayShelf`) show real covers
 * only: with fewer than this many, Home shows a plain rail instead.
 */
export const DISPLAY_MIN = 4;

/** The products with a cover, in order: a display never shows a placeholder. */
export const withCovers = <P extends Pick<ProductCard, "images">>(
  products: readonly P[]
) => products.filter((product) => Boolean(product.images[0]));
