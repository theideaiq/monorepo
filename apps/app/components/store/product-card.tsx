"use client";

import {
  customerCondition,
  localized,
  showsConditionBulb,
} from "@repo/commerce";
import type { ProductCard as ProductCardData } from "@repo/commerce/catalog";
import { ConditionBulb } from "@repo/design-system/components/brand/condition-bulb";
import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
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

/**
 * A catalog tile linking to the product page, with a wishlist heart: the
 * image on a sunken ground, a 2-line name, the price (with any saving), the condition bulb for used and rental items, and a full-width
 * call to action (violet for rentals).
 */
export const ProductCard = ({ product, rating }: ProductCardProps) => {
  const locale = useLocale();
  const t = useTranslations("store");
  const name = localized(product, "name", locale);
  const rental = product.kind === "rental";
  const condition = customerCondition(product.condition);

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
          {showsConditionBulb(product) ? (
            <ConditionBulb
              condition={condition}
              label={t(`conditionBulb.${condition}`)}
            />
          ) : null}
        </div>
        <span
          className={cn(
            buttonVariants({
              size: "sm",
              variant: rental ? "plus" : "default",
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
