interface VariantLike {
  id: string;
  price_override: number | null;
  stock_count: number;
}

interface ProductLike<Variant extends VariantLike> {
  price: number;
  product_variants: Variant[];
  stock_count: number;
}

/**
 * The chosen variant of a product with its price and stock, like
 * `create_order()` prices it. `ready` is false while a product with
 * variants has none chosen.
 */
export const pickVariant = <Variant extends VariantLike>(
  product: ProductLike<Variant>,
  variantId: string | null
) => {
  const variant =
    product.product_variants.find((candidate) => candidate.id === variantId) ??
    null;
  const hasVariants = product.product_variants.length > 0;
  // Products with variants keep their stock per variant.
  let stock = hasVariants ? 0 : product.stock_count;
  if (variant) {
    stock = variant.stock_count;
  }

  return {
    price: variant?.price_override ?? product.price,
    ready: !hasVariants || variant !== null,
    stock,
    variant,
  };
};

/** The variant to preselect: the only one, when there is no choice to make. */
export const variantForDeepLink = <Variant extends VariantLike>(
  variants: readonly Variant[]
) => (variants.length === 1 ? variants[0] : undefined);
