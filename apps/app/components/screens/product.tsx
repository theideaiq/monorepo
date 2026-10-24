"use client";

import { describeAttributes, localized } from "@repo/commerce";
import type { ProductDetail } from "@repo/commerce/catalog";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { Link, useRouter } from "@repo/internationalization/navigation";
import {
  ArrowLeftIcon,
  BadgeCheckIcon,
  CheckIcon,
  ShoppingCartIcon,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { Price } from "@/components/store/price";
import { ProductImage } from "@/components/store/product-image";
import { ProductReviews } from "@/components/store/product-reviews";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { RatingSummary } from "@/components/store/stars";
import { StockBadge } from "@/components/store/stock-badge";
import { WishlistButton } from "@/components/store/wishlist-button";
import { MAX_QUANTITY } from "@/lib/cart";
import { pickVariant, variantForDeepLink } from "@/lib/product";
import { useProductRatings } from "@/lib/review-queries";
import { useAddToCart, useProduct } from "@/lib/store-queries";

const Details = ({ details }: { readonly details: unknown }) => {
  const t = useTranslations("app.store.product");
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return null;
  }
  const entries = Object.entries(details as Record<string, unknown>);
  if (entries.length === 0) {
    return null;
  }
  return (
    <section className="grid gap-2">
      <h2 className="font-semibold">{t("details")}</h2>
      <dl className="divide-y rounded-md border text-sm">
        {entries.map(([key, value]) => (
          <div className="grid grid-cols-2 gap-4 p-3" key={key}>
            <dt className="text-muted-foreground">{key}</dt>
            <dd>{String(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};

/** Stars and count, jumping to the reviews below. */
const RatingLink = ({ productId }: { readonly productId: string }) => {
  const rating = useProductRatings([productId]).data?.get(productId);
  return rating ? (
    <a className="justify-self-start hover:underline" href="#reviews">
      <RatingSummary className="text-sm" rating={rating} />
    </a>
  ) : null;
};

/** Who sells the product, and whether The IDEA verified the seller. */
const Seller = ({ product }: { readonly product: ProductDetail }) => {
  const t = useTranslations("app.store.product");
  return (
    <p className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-muted-foreground">
        {t("soldBy", { seller: product.seller })}
      </span>
      {product.verified ? (
        <span className="inline-flex items-center gap-1 font-medium text-emerald-700 text-xs dark:text-emerald-300">
          <BadgeCheckIcon className="size-4" />
          {t("verifiedSeller")}
        </span>
      ) : null}
    </p>
  );
};

const ProductView = ({ product }: { readonly product: ProductDetail }) => {
  const t = useTranslations("app.store.product");
  const tStore = useTranslations("store");
  const locale = useLocale();
  const router = useRouter();
  const deepLinkAdd = useSearchParams().get("add") === "1";
  const add = useAddToCart();
  const variants = product.product_variants;
  const [variantId, setVariantId] = useState<string | null>(
    () => variantForDeepLink(variants)?.id ?? null
  );
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const autoAdded = useRef(false);

  const name = localized(product, "name", locale);
  const description = localized(product, "description", locale);
  const selection = pickVariant(product, variantId);
  const image = selection.variant?.image ?? product.images[0] ?? null;
  const canAdd =
    product.kind === "sale" &&
    product.status === "active" &&
    selection.ready &&
    selection.stock > 0;

  const addToCart = (amount: number) => {
    setAdded(false);
    add.mutate(
      {
        analytics: {
          currency: product.currency,
          id: product.id,
          name,
          price: selection.price,
        },
        productId: product.id,
        quantity: amount,
        variantId: selection.variant?.id ?? null,
      },
      { onSuccess: () => setAdded(true) }
    );
  };

  // From the website ("Buy" → /store/product?slug=…&add=1): add one copy
  // once, when no choice is needed, then drop the flag from the URL.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per deep link
  useEffect(() => {
    if (!deepLinkAdd || autoAdded.current) {
      return;
    }
    autoAdded.current = true;
    if (canAdd) {
      addToCart(1);
    }
    router.replace({
      pathname: "/store/product",
      query: { slug: product.slug },
    });
  }, [deepLinkAdd]);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div className="grid content-start gap-3">
        <ProductImage
          alt={name}
          path={image}
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
        />
        {product.images.length > 1 ? (
          <ul className="grid grid-cols-5 gap-2">
            {product.images.slice(1, 6).map((path) => (
              <li key={path}>
                <ProductImage alt={name} path={path} sizes="20vw" />
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="grid content-start gap-5">
        <div className="grid gap-2">
          {product.category ? (
            <Link
              className="text-muted-foreground text-sm hover:underline"
              href={{
                pathname: "/store",
                query: { category: product.category.slug },
              }}
            >
              {localized(product.category, "name", locale)}
            </Link>
          ) : null}
          <h2 className="font-semibold text-2xl tracking-tight">{name}</h2>
          <RatingLink productId={product.id} />
          <Seller product={product} />
          <Price
            className="text-xl"
            compareAtPrice={
              selection.variant?.price_override
                ? null
                : product.compare_at_price
            }
            price={selection.price}
          />
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">
              {t("condition")}: {tStore(`condition.${product.condition}`)}
            </span>
            {product.kind === "sale" ? (
              <StockBadge count={selection.stock} />
            ) : null}
          </div>
        </div>

        {product.kind === "rental" ? (
          <div className="grid gap-3 rounded-lg border p-4">
            <p className="text-sm">{t("rentalOnly")}</p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/plus">{t("goToPlus")}</Link>
              </Button>
              <WishlistButton productId={product.id} withLabel />
            </div>
          </div>
        ) : (
          <>
            {variants.length > 0 ? (
              <fieldset className="grid gap-2">
                <legend className="mb-2 font-medium text-sm">
                  {t("options")}
                </legend>
                <div className="flex flex-wrap gap-2">
                  {variants.map((variant) => (
                    <button
                      aria-pressed={variant.id === variantId}
                      className={cn(
                        "rounded-md border px-3 py-2 text-start text-sm transition-colors",
                        variant.id === variantId
                          ? "border-primary bg-primary/10"
                          : "hover:bg-accent",
                        variant.stock_count <= 0 && "opacity-50"
                      )}
                      key={variant.id}
                      onClick={() => {
                        setVariantId(variant.id);
                        setQuantity(1);
                      }}
                      type="button"
                    >
                      {describeAttributes(variant.attributes) || variant.sku}
                    </button>
                  ))}
                </div>
                {selection.ready ? null : (
                  <p className="text-muted-foreground text-xs">
                    {t("chooseOption")}
                  </p>
                )}
              </fieldset>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <QuantityStepper
                decreaseLabel={t("decrease")}
                disabled={!canAdd}
                increaseLabel={t("increase")}
                label={t("quantity")}
                max={Math.max(1, Math.min(selection.stock, MAX_QUANTITY))}
                onChange={setQuantity}
                value={quantity}
              />
              <Button
                disabled={!canAdd || add.isPending}
                onClick={() => addToCart(quantity)}
                size="lg"
              >
                <ShoppingCartIcon />
                {add.isPending ? t("adding") : t("addToCart")}
              </Button>
              <WishlistButton productId={product.id} withLabel />
            </div>
            {added ? (
              <p
                className="flex flex-wrap items-center gap-2 text-sm"
                role="status"
              >
                <CheckIcon className="size-4 text-emerald-600" />
                {t("added")}
                <Link
                  className="font-medium text-primary hover:underline"
                  href="/cart"
                >
                  {t("viewCart")}
                </Link>
              </p>
            ) : null}
            {add.isError ? (
              <p className="text-destructive text-sm" role="alert">
                {t("addFailed")}
              </p>
            ) : null}
          </>
        )}

        {description ? (
          <section className="grid gap-2">
            <h2 className="font-semibold">{t("about")}</h2>
            <p className="whitespace-pre-line text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </section>
        ) : null}
        <Details details={product.details} />
      </div>
    </div>
  );
};

/** /store/product?slug=… (query parameter: the app is a static export). */
export const Product = () => {
  const t = useTranslations("app.store");
  const slug = useSearchParams().get("slug") ?? "";
  const product = useProduct(slug);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-6 p-4 pt-0">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/store"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("product.back")}
        </Link>
        {product.isPending && slug ? <SectionSpinner /> : null}
        {product.isError ? (
          <ErrorState onRetry={() => product.refetch()} />
        ) : null}
        {!slug || product.data === null ? (
          <p className="text-muted-foreground">{t("product.notFound")}</p>
        ) : null}
        {product.data ? (
          <>
            <ProductView product={product.data} />
            <ProductReviews productId={product.data.id} />
          </>
        ) : null}
      </div>
    </>
  );
};
