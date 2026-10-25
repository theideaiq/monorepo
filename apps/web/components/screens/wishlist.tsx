"use client";

import { liveVariants, localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { Link } from "@repo/internationalization/navigation";
import { HeartIcon, ShoppingCartIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { Price } from "@/components/store/price";
import { productHref } from "@/components/store/product-card";
import { ProductImage } from "@/components/store/product-image";
import { StockBadge } from "@/components/store/stock-badge";
import {
  useMoveToCart,
  useToggleWishlist,
  useWishlist,
  type WishlistItem,
} from "@/lib/wishlist-queries";

type Product = NonNullable<WishlistItem["product"]>;

/** What the main button of a wishlist line does. */
export const wishlistAction = (
  product: Product
): "choose" | "move" | "rent" | "unavailable" => {
  if (product.status !== "active") {
    return "unavailable";
  }
  if (product.kind === "rental") {
    return "rent";
  }
  if (liveVariants(product.variants).length > 1) {
    return "choose";
  }
  return product.stock_count > 0 ? "move" : "unavailable";
};

const WishlistLine = ({ product }: { readonly product: Product }) => {
  const t = useTranslations("app.wishlist");
  const locale = useLocale();
  const move = useMoveToCart();
  const remove = useToggleWishlist();
  const name = localized(product, "name", locale);
  const action = wishlistAction(product);

  return (
    <li className="flex gap-4 py-4">
      <Link className="w-20 shrink-0 sm:w-24" href={productHref(product.slug)}>
        <ProductImage alt={name} path={product.images[0]} sizes="96px" />
      </Link>
      <div className="grid min-w-0 flex-1 content-start gap-1.5">
        <Link
          className="line-clamp-2 font-medium text-sm hover:underline"
          href={productHref(product.slug)}
        >
          {name}
        </Link>
        {product.kind === "sale" ? (
          <>
            <Price
              className="text-sm"
              compareAtPrice={product.compare_at_price}
              price={product.price}
            />
            <StockBadge count={product.stock_count} />
          </>
        ) : (
          <span className="text-muted-foreground text-xs">{t("rental")}</span>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {action === "move" ? (
            <Button
              disabled={move.isPending}
              onClick={() => move.mutate({ name, product })}
              size="sm"
            >
              <ShoppingCartIcon />
              {move.isPending ? t("moving") : t("moveToCart")}
            </Button>
          ) : null}
          {action === "choose" ? (
            <Button asChild size="sm">
              <Link href={productHref(product.slug)}>{t("chooseOptions")}</Link>
            </Button>
          ) : null}
          {action === "rent" ? (
            <Button asChild size="sm" variant="plus">
              <Link href="/plus">{t("rentWithPlus")}</Link>
            </Button>
          ) : null}
          {action === "unavailable" ? (
            <span className="text-muted-foreground text-xs">
              {t("unavailable")}
            </span>
          ) : null}
          <Button
            disabled={remove.isPending}
            onClick={() =>
              remove.mutate({ productId: product.id, saved: true })
            }
            size="sm"
            variant="ghost"
          >
            {t("remove")}
          </Button>
        </div>
        {move.isError ? (
          <p className="text-destructive text-xs" role="alert">
            {t("moveFailed")}
          </p>
        ) : null}
      </div>
    </li>
  );
};

/** /wishlist: saved products, ready to move to the cart. */
export const Wishlist = () => {
  const t = useTranslations("app.wishlist");
  const wishlist = useWishlist();
  const items = (wishlist.data ?? []).flatMap((item) =>
    item.product ? [item.product] : []
  );

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <p className="text-muted-foreground">{t("description")}</p>
        {wishlist.isPending ? <SectionSpinner /> : null}
        {wishlist.isError ? (
          <ErrorState onRetry={() => wishlist.refetch()} />
        ) : null}
        {wishlist.data && items.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HeartIcon />
              </EmptyMedia>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/store">{t("empty.browse")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {items.length ? (
          <ul className="divide-y">
            {items.map((product) => (
              <WishlistLine key={product.id} product={product} />
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};
