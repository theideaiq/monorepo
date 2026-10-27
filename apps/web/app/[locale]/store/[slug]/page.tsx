import {
  discountPercent,
  formatPrice,
  hasPriceRange,
  localized,
  planName,
} from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { HandCoins, MoveLeft, Truck } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { CoverImage } from "@/components/cover-image";
import { stockLabel } from "@/components/product-card";
import { ProductCondition } from "@/components/product-condition";
import {
  ProductReviews,
  RatingLink,
  SellerLine,
} from "@/components/product-reviews";
import { BoxContents } from "@/components/store/box-contents";
import { WriteReview } from "@/components/store/product-reviews";
import { PurchasePanel } from "@/components/store/purchase-panel";
import {
  getBox,
  getOffers,
  getPlans,
  getProduct,
  getProductSlugs,
  getRatings,
  getReviews,
  imageUrl,
  type ProductDetail,
} from "@/lib/data";
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

/** The Plus plan renting it needs, when it needs more than the entry plan. */
const rentalPlan = async ({
  rentable,
  rental_tier: tier,
}: Pick<ProductDetail, "rentable" | "rental_tier">) =>
  rentable && tier !== null ? requiredPlan(await getPlans("plus"), tier) : null;

const ProductPage = async ({ params }: ProductProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }

  const [t, store, ratings, reviews, plan, offers, box] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.product" }),
    getTranslations({ locale, namespace: "store" }),
    getRatings([product.id]),
    getReviews(product.id, REVIEWS_SHOWN),
    rentalPlan(product),
    getOffers(product.id),
    getBox(product.id),
  ]);
  const rating = ratings[product.id] ?? null;
  const name = localized(product, "name", locale);
  const description = localized(product, "description", locale);
  const images = product.images
    .map((path) => imageUrl(path))
    .filter((url): url is string => Boolean(url));
  const discount = discountPercent(product.price, product.compare_at_price);
  const rental = product.kind === "rental";
  // Several versions at different prices: the cheapest, as "From …".
  const priceRange = hasPriceRange(product.product_variants);
  const specs = productSpecs(product.details);
  const pageUrl = new URL(localePath(locale, `/store/${slug}`), siteUrl()).href;

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
            fit="product"
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
                    fit="product"
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
              {product.age_rating ? (
                <Badge variant="outline">
                  {store("ageRating", {
                    rating: formatNumber(product.age_rating, locale),
                  })}
                </Badge>
              ) : null}
            </div>
            <ProductCondition locale={locale} product={product} />
            <h1 className="font-bold text-3xl tracking-tight md:text-4xl">
              {name}
            </h1>
            <SellerLine
              locale={locale}
              seller={product.seller}
              verified={product.verified}
            />
            {rating ? <RatingLink locale={locale} rating={rating} /> : null}
            {rental ? (
              <p className="text-muted-foreground text-sm tabular-nums">
                {store("price.worth", {
                  price: formatPrice(product.price, locale),
                })}
              </p>
            ) : (
              <p className="flex flex-wrap items-baseline gap-3">
                <span className="font-bold text-2xl">
                  {priceRange
                    ? store("price.from", {
                        price: formatPrice(product.price, locale),
                      })
                    : formatPrice(product.price, locale)}
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
            <Suspense>
              <PurchasePanel box={box} offers={offers} product={product} />
            </Suspense>
            {plan ? (
              <div className="flex flex-col gap-1 rounded-md border border-brand/60 bg-brand/10 p-3 text-sm">
                <p className="font-medium">
                  {t("requiresPlan", { plan: planName(plan, locale) })}
                </p>
                <p className="text-muted-foreground">
                  {t("requiresPlanNote", { plan: planName(plan, locale) })}
                </p>
              </div>
            ) : null}
            {rental ? null : (
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <Truck aria-hidden="true" className="size-4" />
                {t("delivery")}
              </p>
            )}
            <Link
              className="flex items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
              href="/pass/orders#sell"
            >
              <HandCoins aria-hidden="true" className="size-4" />
              {t("sellToUs")}
            </Link>
          </div>

          <BoxContents box={box} locale={locale} />

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
              <dl className="divide-y rounded-md border text-sm">
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
        write={<WriteReview productId={product.id} />}
      />
    </div>
  );
};

export default ProductPage;
