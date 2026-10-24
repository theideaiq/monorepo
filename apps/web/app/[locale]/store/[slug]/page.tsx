import {
  describeAttributes,
  discountPercent,
  formatPrice,
  localized,
} from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { MoveLeft, ShoppingBag, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { stockLabel } from "@/components/product-card";
import {
  ProductReviews,
  RatingLink,
  SellerLine,
} from "@/components/product-reviews";
import { env } from "@/env";
import {
  getPlans,
  getProduct,
  getProductSlugs,
  getRatings,
  getReviews,
  imageUrl,
  type ProductDetail,
} from "@/lib/data";
import { appProductLink } from "@/lib/links";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata, siteUrl } from "@/lib/metadata";
import { requiredPlan } from "@/lib/plus";
import { productJsonLd, productSpecs } from "@/lib/product";

export const revalidate = 300;

/** Latest published reviews listed on a product page. */
const REVIEWS_SHOWN = 10;

interface ProductProps {
  params: Promise<{ locale: Locale; slug: string }>;
}

export const generateStaticParams = async () =>
  (await getProductSlugs()).slice(0, 200).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: ProductProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return {};
  }
  const description = localized(product, "description", locale);
  return localizedMetadata(locale, `/store/${slug}`, {
    description: description ? markdownToText(description, 160) : "",
    image: imageUrl(product.images[0]),
    title: localized(product, "name", locale),
  });
};

/** The Plus plan a rental item needs, when it needs more than the entry plan. */
const rentalPlan = async ({
  kind,
  rental_tier: tier,
}: Pick<ProductDetail, "kind" | "rental_tier">) =>
  kind === "rental" && tier !== null
    ? requiredPlan(await getPlans("plus"), tier)
    : null;

const ProductPage = async ({ params }: ProductProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }

  const [t, store, ratings, reviews, plan] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.product" }),
    getTranslations({ locale, namespace: "store" }),
    getRatings([product.id]),
    getReviews(product.id, REVIEWS_SHOWN),
    rentalPlan(product),
  ]);
  const rating = ratings[product.id] ?? null;
  const name = localized(product, "name", locale);
  const description = localized(product, "description", locale);
  const images = product.images
    .map((path) => imageUrl(path))
    .filter((url): url is string => Boolean(url));
  const discount = discountPercent(product.price, product.compare_at_price);
  const rental = product.kind === "rental";
  const specs = productSpecs(product.details);
  const buyUrl = appProductLink(env.NEXT_PUBLIC_APP_URL, locale, slug);
  const pageUrl = new URL(`/${locale}/store/${slug}`, siteUrl()).href;

  return (
    <div className="container mx-auto px-4 py-10">
      <JsonLd
        code={productJsonLd({
          images,
          locale,
          name,
          pageUrl,
          product,
          rating,
          reviews,
        })}
      />
      <Link
        className="mb-6 inline-flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={rental ? "/plus" : "/store"}
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {rental ? t("plusBack") : t("back")}
      </Link>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <CoverImage
            alt={t("image", { name, number: formatNumber(1, locale) })}
            className="aspect-square"
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            src={images[0] ?? null}
          />
          {images.length > 1 ? (
            <ul className="grid grid-cols-4 gap-3">
              {images.slice(1).map((src, index) => (
                <li key={src}>
                  <CoverImage
                    alt={t("image", {
                      name,
                      number: formatNumber(index + 2, locale),
                    })}
                    className="aspect-square"
                    sizes="12vw"
                    src={src}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{store(`kind.${product.kind}`)}</Badge>
              {product.category ? (
                <Badge variant="outline">
                  {localized(product.category, "name", locale)}
                </Badge>
              ) : null}
              <Badge variant="outline">
                {store(`condition.${product.condition}`)}
              </Badge>
            </div>
            <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
              {name}
            </h1>
            <SellerLine
              locale={locale}
              seller={product.seller}
              verified={product.verified}
            />
            {rating ? <RatingLink locale={locale} rating={rating} /> : null}
            {rental ? null : (
              <p className="flex flex-wrap items-baseline gap-3">
                <span className="font-bold text-2xl">
                  {formatPrice(product.price, locale)}
                </span>
                {discount > 0 && product.compare_at_price ? (
                  <>
                    <span className="text-lg text-muted-foreground line-through">
                      {formatPrice(product.compare_at_price, locale)}
                    </span>
                    <Badge>
                      {store("price.save", {
                        percent: formatNumber(discount, locale),
                      })}
                    </Badge>
                  </>
                ) : null}
              </p>
            )}
            <p
              className={
                product.stock_count > 0
                  ? "text-muted-foreground text-sm"
                  : "text-destructive text-sm"
              }
            >
              {stockLabel(store, product.stock_count, locale)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild className="w-full gap-2 sm:w-fit" size="lg">
              <a href={buyUrl}>
                <ShoppingBag className="size-4" />
                {rental ? t("rent") : t("buy")}
              </a>
            </Button>
            <p className="text-muted-foreground text-sm">
              {rental ? t("rentNote") : t("buyNote")}
            </p>
            {plan ? (
              <div className="flex flex-col gap-1 rounded-lg border border-brand/60 bg-brand/10 p-3 text-sm">
                <p className="font-medium">
                  {t("requiresPlan", { plan: plan.name })}
                </p>
                <p className="text-muted-foreground">
                  {t("requiresPlanNote", { plan: plan.name })}
                </p>
              </div>
            ) : null}
            {rental ? null : (
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <Truck aria-hidden="true" className="size-4" />
                {t("delivery")}
              </p>
            )}
          </div>

          {product.product_variants.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold text-lg">{t("variants")}</h2>
              <ul className="divide-y rounded-lg border">
                {product.product_variants.map((variant) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
                    key={variant.id}
                  >
                    <span>{describeAttributes(variant.attributes)}</span>
                    <span className="flex items-center gap-3">
                      {rental ? null : (
                        <span className="font-medium">
                          {formatPrice(
                            variant.price_override ?? product.price,
                            locale
                          )}
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        {stockLabel(store, variant.stock_count, locale)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {description ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold text-lg">{t("description")}</h2>
              <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                {description}
              </p>
            </section>
          ) : null}

          {specs.length > 0 ? (
            <section className="flex flex-col gap-3">
              <h2 className="font-semibold text-lg">{t("specs")}</h2>
              <dl className="divide-y rounded-lg border text-sm">
                {specs.map(([label, value]) => (
                  <div className="grid grid-cols-2 gap-4 p-3" key={label}>
                    <dt className="text-muted-foreground">{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
        </div>
      </div>

      <ProductReviews
        locale={locale}
        rating={rating}
        reviews={reviews}
        writeUrl={buyUrl}
      />
    </div>
  );
};

export default ProductPage;
