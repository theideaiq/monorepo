import { Badge } from "@repo/design-system/components/ui/badge";
import { discountPercent, formatPrice, localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { imageUrl, type ProductCard as Product } from "@/lib/data";
import { CoverImage } from "./cover-image";

const LOW_STOCK = 5;

interface ProductCardProps {
  readonly locale: Locale;
  readonly product: Product;
}

/** A product tile linking to its page on this site. */
export const ProductCard = async ({ locale, product }: ProductCardProps) => {
  const t = await getTranslations({ locale, namespace: "store" });
  const name = localized(product, "name", locale);
  const discount = discountPercent(product.price, product.compare_at_price);
  const rental = product.kind === "rental";

  return (
    <Link
      className="group flex flex-col gap-3 rounded-xl border bg-card p-3 transition-shadow hover:shadow-md"
      href={`/store/${product.slug}`}
    >
      <div className="relative">
        <CoverImage alt={name} src={imageUrl(product.images[0])} />
        <div className="absolute start-2 top-2 flex flex-wrap gap-1">
          {discount > 0 ? (
            <Badge>
              {t("price.save", { percent: formatNumber(discount, locale) })}
            </Badge>
          ) : null}
          {product.condition === "new" ? null : (
            <Badge variant="secondary">{t(`condition.${product.condition}`)}</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-1">
        <h3 className="line-clamp-2 font-medium group-hover:text-primary">
          {name}
        </h3>
        {rental ? (
          <p className="text-muted-foreground text-sm">{t("kind.rental")}</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-2">
            <span className="font-semibold">
              {formatPrice(product.price, locale)}
            </span>
            {discount > 0 && product.compare_at_price ? (
              <span className="text-muted-foreground text-sm line-through">
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
      </div>
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
