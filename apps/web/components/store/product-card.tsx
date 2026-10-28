"use client";

import { hasPriceRange, localized } from "@repo/commerce";
import type { ProductCard as ProductCardData } from "@repo/commerce/catalog";
import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { Rating } from "@/lib/review-queries";
import { Price, RentOnly } from "./price";
import { ProductCondition } from "./product-condition";
import { ProductImage } from "./product-image";
import { RatingSummary } from "./stars";
import { StockBadge } from "./stock-badge";
import { VariantChips } from "./variant-chips";
import { WishlistButton } from "./wishlist-button";

interface ProductCardProps {
  readonly product: ProductCardData;
  /** From a batch product_ratings query; absent without reviews. */
  readonly rating?: Rating;
}

export const productHref = (slug: string) =>
  `/store/${encodeURIComponent(slug)}`;

/**
 * A catalog tile linking to the product page, with a wishlist heart: the
 * image on a sunken ground, a 2-line name, the versions it comes in, the
 * price ("from" across versions, with any saving), the condition of
 * used items, and a full-width pink call to action.
 */
export const ProductCard = ({ product, rating }: ProductCardProps) => {
  const locale = useLocale();
  const t = useTranslations("store");
  const name = localized(product, "name", locale);
  const rental = product.kind === "rental";

  return (
    <li className="relative flex">
      <Link
        className="group flex w-full flex-col gap-2 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        href={productHref(product.slug)}
      >
        <ProductImage
          alt={name}
          className="transition-opacity group-hover:opacity-90"
          path={product.images[0]}
        />
        {/* Grows so the button sits at the bottom of every tile in a row,
            whether the name takes one line or two. */}
        <div className="grid flex-1 content-start gap-1 px-1">
          <span className="line-clamp-2 font-medium text-sm">{name}</span>
          <VariantChips locale={locale} variants={product.variants} />
          {rental ? (
            <RentOnly price={product.price} />
          ) : (
            <Price
              className="text-sm"
              compareAtPrice={product.compare_at_price}
              from={hasPriceRange(product.variants)}
              price={product.price}
            />
          )}
          {rating ? <RatingSummary rating={rating} /> : null}
          <StockBadge count={product.stock_count} />
          <ProductCondition product={product} />
        </div>
        <span
          className={cn(
            buttonVariants({
              size: "sm",
              variant: "default",
            }),
            "w-full"
          )}
        >
          {rental ? t("card.rent") : t("card.buy")}
        </span>
      </Link>
      <WishlistButton
        className="absolute end-3 top-3 size-8 rounded-full bg-background/80 shadow-sm backdrop-blur"
        productId={product.id}
      />
    </li>
  );
};
