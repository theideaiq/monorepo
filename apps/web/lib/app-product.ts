interface VariantLike {
  /** False for a hidden variant; missing counts as live. */
  active?: boolean;
  id: string;
  price: number;
  stock_count: number;
}

interface ProductLike<Variant extends VariantLike> {
  price: number;
  product_variants: Variant[];
}

/** The variants customers can choose (hidden ones left out). */
export const liveVariants = <Variant extends VariantLike>(
  variants: readonly Variant[]
) => variants.filter((variant) => variant.active !== false);

/**
 * The chosen variant of a product with its price and stock, like
 * `create_order()` prices it. A product with one live variant has it
 * chosen; with several, `ready` is false until one is.
 */
export const pickVariant = <Variant extends VariantLike>(
  product: ProductLike<Variant>,
  variantId: string | null
) => {
  const live = liveVariants(product.product_variants);
  const variant =
    live.find((candidate) => candidate.id === variantId) ??
    (live.length === 1 ? (live[0] ?? null) : null);

  return {
    price: variant?.price ?? product.price,
    ready: variant !== null,
    stock: variant?.stock_count ?? 0,
    variant,
  };
};

/** The variant to preselect: the only live one, when there is no choice. */
export const variantForDeepLink = <Variant extends VariantLike>(
  variants: readonly Variant[]
) => {
  const live = liveVariants(variants);
  return live.length === 1 ? live[0] : undefined;
};
