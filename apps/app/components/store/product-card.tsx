"use client";

import { localized } from "@repo/commerce";
import type { ProductCard as ProductCardData } from "@repo/commerce/catalog";
import { Link } from "@repo/internationalization/navigation";
import { useLocale } from "next-intl";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { StockBadge } from "./stock-badge";

interface ProductCardProps {
  readonly product: ProductCardData;
}

export const productHref = (slug: string) => ({
  pathname: "/store/product",
  query: { slug },
});

/** A catalog tile linking to the product page. */
export const ProductCard = ({ product }: ProductCardProps) => {
  const locale = useLocale();
  const name = localized(product, "name", locale);

  return (
    <li>
      <Link
        className="group grid gap-2 rounded-xl p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={productHref(product.slug)}
      >
        <ProductImage
          alt={name}
          className="transition-opacity group-hover:opacity-90"
          path={product.images[0]}
        />
        <div className="grid gap-1 px-1">
          <span className="line-clamp-2 font-medium text-sm">{name}</span>
          <Price
            className="text-sm"
            compareAtPrice={product.compare_at_price}
            price={product.price}
          />
          <StockBadge count={product.stock_count} />
        </div>
      </Link>
    </li>
  );
};
