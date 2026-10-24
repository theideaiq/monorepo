"use client";

import { localized } from "@repo/commerce";
import type { ProductCard as ProductCardData } from "@repo/commerce/catalog";
import { Link } from "@repo/internationalization/navigation";
import { useLocale } from "next-intl";
import type { Rating } from "@/lib/review-queries";
import { Price } from "./price";
import { ProductImage } from "./product-image";
import { RatingSummary } from "./stars";
import { StockBadge } from "./stock-badge";
import { WishlistButton } from "./wishlist-button";

interface ProductCardProps {
  readonly product: ProductCardData;
  /** From a batch product_ratings query; absent without reviews. */
  readonly rating?: Rating;
}

export const productHref = (slug: string) =>
  `/store/${encodeURIComponent(slug)}`;

/** A catalog tile linking to the product page, with a wishlist heart. */
export const ProductCard = ({ product, rating }: ProductCardProps) => {
  const locale = useLocale();
  const name = localized(product, "name", locale);

  return (
    <li className="relative">
      <Link
        className="group grid gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
          {rating ? <RatingSummary rating={rating} /> : null}
          <StockBadge count={product.stock_count} />
        </div>
      </Link>
      <WishlistButton
        className="absolute end-3 top-3 size-8 rounded-full bg-background/80 shadow-sm backdrop-blur"
        productId={product.id}
      />
    </li>
  );
};
