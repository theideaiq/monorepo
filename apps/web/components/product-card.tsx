import {
  discountPercent,
  formatPrice,
  hasPriceRange,
  localized,
} from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { buttonVariants } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { imageUrl, type ProductCard as Product } from "@/lib/data";
import { formatRating, type Rating } from "@/lib/reviews";
import { CoverImage } from "./cover-image";
import { ProductConditionBulb } from "./product-condition-bulb";
import { Stars } from "./stars";
import { VariantChips } from "./store/variant-chips";

const LOW_STOCK = 5;

interface ProductCardProps {
  /** Shown as a rental (violet, no price), as on the Rent tab; default: rental items. */
  readonly forRent?: boolean;
  readonly locale: Locale;
  /** The plan a rental item needs, shown on the image (e.g. "Plus Extra and above"). */
  readonly planLabel?: string | null;
  readonly product: Product;
  /** Published reviews' average and count, when the product has any. */
  readonly rating?: Rating | null;
}

/**
 * A product tile linking to its page on this site: the image on a sunken
 * ground, badges top-start, a 2-line name, the versions it comes in, the
 * price ("from" across versions), the condition bulb for used items, and
 * a full-width call to action (violet for rentals).
 */
export const ProductCard = async ({
  forRent,
  locale,
  planLabel,
  product,
  rating,
}: ProductCardProps) => {
  const [t, r] = await Promise.all([
    getTranslations({ locale, namespace: "store" }),
    getTranslations({ locale, namespace: "web.store.rating" }),
  ]);
  const name = localized(product, "name", locale);
  const discount = discountPercent(product.price, product.compare_at_price);
  const rental = forRent ?? product.kind === "rental";

  return (
    <Link
      className="group flex w-full flex-col gap-3 rounded-lg border bg-card p-3 shadow-1 transition-shadow hover:shadow-2"
      href={`/store/${product.slug}`}
    >
      <div className="relative">
        <CoverImage
          alt={name}
          fit="product"
          src={imageUrl(product.images[0])}
        />
        <div className="absolute start-2 top-2 flex flex-wrap gap-1">
          {discount > 0 ? (
            <Badge>
              {t("price.save", { percent: formatNumber(discount, locale) })}
            </Badge>
          ) : null}
          {planLabel ? <Badge variant="highlight">{planLabel}</Badge> : null}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1">
        <h3 className="line-clamp-2 font-medium group-hover:text-pink-text">
          {name}
        </h3>
        <VariantChips locale={locale} variants={product.variants} />
        {rating ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Stars
              className="text-sm"
              label={r("label", {
                rating: formatRating(rating.average, locale),
              })}
              value={rating.average}
            />
            <span aria-hidden="true">
              {r("short", {
                rating: formatRating(rating.average, locale),
                reviews: formatNumber(rating.count, locale),
              })}
            </span>
            <span className="sr-only">
              {r("count", {
                count: rating.count,
                reviews: formatNumber(rating.count, locale),
              })}
            </span>
          </p>
        ) : null}
        {rental ? (
          <p className="text-muted-foreground text-sm">{t("kind.rental")}</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono font-semibold tabular-nums">
              {hasPriceRange(product.variants)
                ? t("price.from", { price: formatPrice(product.price, locale) })
                : formatPrice(product.price, locale)}
            </span>
            {discount > 0 && product.compare_at_price ? (
              <span className="font-mono text-muted-foreground text-sm tabular-nums line-through">
                {formatPrice(product.compare_at_price, locale)}
              </span>
            ) : null}
          </p>
        )}
        <p
          className={
            product.stock_count > 0
              ? "text-muted-foreground text-xs"
              : "text-destructive text-xs"
          }
        >
          {stockLabel(t, product.stock_count, locale)}
        </p>
        <ProductConditionBulb locale={locale} product={product} />
      </div>
      <span
        className={cn(
          buttonVariants({ variant: rental ? "plus" : "default" }),
          "w-full"
        )}
      >
        {rental ? t("card.rent") : t("card.buy")}
      </span>
    </Link>
  );
};

type StoreT = Awaited<ReturnType<typeof getTranslations<"store">>>;

export const stockLabel = (t: StoreT, stock: number, locale: Locale) => {
  if (stock <= 0) {
    return t("stock.outOfStock");
  }
  if (stock <= LOW_STOCK) {
    return t("stock.lowStock", { count: formatNumber(stock, locale) });
  }
  return t("stock.inStock");
};
