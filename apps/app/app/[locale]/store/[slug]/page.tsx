import {
  discountPercent,
  formatPrice,
  hasPriceRange,
  localized,
} from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { localePath } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { JsonLd } from "@repo/seo/json-ld";
import { MoveLeft, Truck } from "lucide-react";
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
import { BundleContents } from "@/components/store/bundle-contents";
import { CategoryShelf } from "@/components/store/category-shelf";
import { WriteReview } from "@/components/store/product-reviews";
import { EarnNote, PurchasePanel } from "@/components/store/purchase-panel";
import {
  getBundle,
  getCategories,
  getOffers,
  getProduct,
  getProductSlugs,
  getRatings,
  getReviews,
  imageUrl,
  type ProductDetail,
} from "@/lib/data";
import { markdownToText } from "@/lib/markdown";
import { localizedMetadata, siteUrl } from "@/lib/metadata";
import { productJsonLd, productSpecs } from "@/lib/product";
import { parseStoreQuery } from "@/lib/store-params";

export const revalidate = 300;

/** Latest published reviews listed on a product page. */
const REVIEWS_SHOWN = 10;

interface ProductProps {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** The top-level category a slug names (a product's slug never does). */
const topCategory = async (slug: string) =>
  (await getCategories("sale")).find(
    (category) => !category.parent_id && category.slug === slug
  );

export const generateStaticParams = async () =>
  (await getProductSlugs()).slice(0, 200).map(({ slug }) => ({ slug }));

export const generateMetadata = async ({
  params,
}: ProductProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const category = await topCategory(slug);
  if (category) {
    return localizedMetadata(locale, `/store/${slug}`, {
      description: "",
      title: localized(category, "name", locale),
    });
  }
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

/** The price, "Lowest in 30 days", the Bulbs it earns, stock and delivery. */
const PriceLines = async ({
  locale,
  lowest30d,
  product,
}: {
  readonly locale: Locale;
  readonly lowest30d: number | null | undefined;
  readonly product: ProductDetail;
}) => {
  const [t, store] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.product" }),
    getTranslations({ locale, namespace: "store" }),
  ]);
  const discount = discountPercent(product.price, product.compare_at_price);
  // Several versions at different prices: the cheapest, as "From …".
  const priceRange = hasPriceRange(product.product_variants);
  return (
    <>
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="font-bold text-2xl">
          {priceRange ? (
            store.rich("price.from", {
              amount: (chunks) => <span className="font-mono">{chunks}</span>,
              price: formatPrice(product.price, locale),
            })
          ) : (
            <span className="font-mono">
              {formatPrice(product.price, locale)}
            </span>
          )}
        </span>
        {discount > 0 && product.compare_at_price ? (
          <>
            <span className="font-mono text-lg text-muted-foreground line-through">
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
      {lowest30d ? (
        <p className="text-muted-foreground text-sm">
          {t("lowest30d", { price: formatPrice(lowest30d, locale) })}
        </p>
      ) : null}
      <EarnNote price={product.price} />
      <p
        className={
          product.stock_count > 0
            ? "text-muted-foreground text-sm"
            : "text-destructive text-sm"
        }
      >
        {stockLabel(store, product.stock_count, locale)}
      </p>
      <p className="flex items-center gap-2 text-muted-foreground text-sm">
        <Truck aria-hidden="true" className="size-4" />
        {t("delivery")}
      </p>
    </>
  );
};

/**
 * `/store/<slug>`: a top-level category's shelf, or a product: pictures
 * at the start, the story in the middle and the Get it panel at the end
 * (sticky on wide screens; on phones after the price, with its primary in
 * the bottom dock).
 */
const ProductPage = async ({ params, searchParams }: ProductProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const category = await topCategory(slug);
  if (category) {
    return (
      <CategoryShelf
        categories={await getCategories("sale")}
        category={category}
        locale={locale}
        query={parseStoreQuery(await searchParams)}
      />
    );
  }
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }
  return <ProductView locale={locale} product={product} slug={slug} />;
};

const ProductView = async ({
  locale,
  product,
  slug,
}: {
  readonly locale: Locale;
  readonly product: ProductDetail;
  readonly slug: string;
}) => {
  const [t, store, ratings, reviews, offers, bundle] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.product" }),
    getTranslations({ locale, namespace: "store" }),
    getRatings([product.id]),
    getReviews(product.id, REVIEWS_SHOWN),
    getOffers(product.id),
    getBundle(product.id),
  ]);
  // "Lowest in 30 days": of the cheapest copy for sale.
  const lowest30d = offers
    .filter((offer) => offer.purpose === "sale" && offer.lowest_30d !== null)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0]?.lowest_30d;
  const rating = ratings[product.id] ?? null;
  const name = localized(product, "name", locale);
  const description = localized(product, "description", locale);
  const images = product.images
    .map((path) => imageUrl(path))
    .filter((url): url is string => Boolean(url));
  const rental = product.kind === "rental";
  const specs = productSpecs(product.details);
  const pageUrl = new URL(localePath(locale, `/store/${slug}`), siteUrl()).href;

  return (
    <div className="container mx-auto px-4 py-6 md:py-10">
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
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-muted-foreground text-sm hover:text-foreground"
        href={product.category ? `/store/${product.category.slug}` : "/"}
      >
        <MoveLeft className="size-4 rtl:rotate-180" />
        {product.category
          ? localized(product.category, "name", locale)
          : t("back")}
      </Link>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_22rem]">
        <div className="flex flex-col gap-3 lg:row-span-2">
          <CoverImage
            alt={t("image", { name, number: formatNumber(1, locale) })}
            fit="product"
            priority
            sizes="(min-width: 1024px) 40vw, 100vw"
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
                    sizes="10vw"
                    src={src}
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
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
          {rental ? null : (
            <PriceLines
              locale={locale}
              lowest30d={lowest30d}
              product={product}
            />
          )}
        </div>

        <aside className="lg:sticky lg:top-20 lg:col-start-3 lg:row-span-2 lg:row-start-1">
          <Suspense>
            <PurchasePanel offers={offers} product={product} />
          </Suspense>
        </aside>

        <div className="flex flex-col gap-6 lg:col-start-2">
          <BundleContents items={bundle} locale={locale} />

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
