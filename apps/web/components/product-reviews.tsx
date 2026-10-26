import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatRating, type Rating, type Review } from "@/lib/reviews";
import { ReviewPhotos } from "./review-photos";
import { Stars } from "./stars";

/** "Sold by …" with a verified-seller badge. */
export const SellerLine = async ({
  locale,
  seller,
  verified,
}: {
  readonly locale: Locale;
  readonly seller: string;
  readonly verified: boolean;
}) => {
  const t = await getTranslations({ locale, namespace: "web.store.product" });
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
      <span>{t("seller", { seller })}</span>
      {verified ? (
        <span className="inline-flex items-center gap-1 font-medium text-pink-text">
          <BadgeCheck aria-hidden="true" className="size-4" />
          {t("verifiedSeller")}
        </span>
      ) : null}
    </p>
  );
};

/** Stars, average and review count, linking to the reviews section. */
export const RatingLink = async ({
  locale,
  rating,
}: {
  readonly locale: Locale;
  readonly rating: Rating;
}) => {
  const t = await getTranslations({ locale, namespace: "web.store.rating" });
  const average = formatRating(rating.average, locale);
  return (
    <a
      className="flex w-fit items-center gap-2 text-sm hover:underline"
      href="#reviews"
    >
      <Stars
        className="text-base"
        label={t("label", { rating: average })}
        value={rating.average}
      />
      <span aria-hidden="true" className="font-medium">
        {average}
      </span>
      <span className="text-muted-foreground">
        {t("count", {
          count: rating.count,
          reviews: formatNumber(rating.count, locale),
        })}
      </span>
    </a>
  );
};

interface ProductReviewsProps {
  readonly locale: Locale;
  readonly rating: Rating | null;
  readonly reviews: Review[];
  /** Writing a review: the signed-in customer's own (a client island). */
  readonly write: ReactNode;
}

/** The rating summary and latest published reviews of a product. */
export const ProductReviews = async ({
  locale,
  rating,
  reviews,
  write,
}: ProductReviewsProps) => {
  const [t, ratingT] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.reviews" }),
    getTranslations({ locale, namespace: "web.store.rating" }),
  ]);

  return (
    <section
      aria-labelledby="reviews-title"
      className="mt-14 grid scroll-mt-24 gap-8 border-t pt-10 lg:grid-cols-[1fr_2fr]"
      id="reviews"
    >
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-2xl" id="reviews-title">
          {t("title")}
        </h2>
        {rating ? (
          <div className="flex flex-col gap-2">
            <p className="font-bold text-3xl">
              {t("summary", { rating: formatRating(rating.average, locale) })}
            </p>
            <Stars
              className="text-xl"
              label={ratingT("label", {
                rating: formatRating(rating.average, locale),
              })}
              value={rating.average}
            />
            <p className="text-muted-foreground text-sm">
              {t("basedOn", {
                count: rating.count,
                reviews: formatNumber(rating.count, locale),
              })}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">{t("empty")}</p>
        )}
        {write}
        <p className="text-muted-foreground text-xs">{t("writeNote")}</p>
      </div>

      {reviews.length > 0 ? (
        <div className="flex flex-col gap-4">
          <h3 className="sr-only">{t("latest")}</h3>
          <ul className="flex flex-col divide-y rounded-lg border">
            {reviews.map((review) => (
              <li className="flex flex-col gap-2 p-5" key={review.id}>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Stars
                    className="text-sm"
                    label={ratingT("label", {
                      rating: formatNumber(review.rating, locale),
                    })}
                    value={review.rating}
                  />
                  <span className="font-medium">
                    {review.author_name?.trim() || t("anonymous")}
                  </span>
                  <time
                    className="text-muted-foreground text-sm"
                    dateTime={review.created_at}
                  >
                    {formatDate(review.created_at, locale)}
                  </time>
                  {review.verified_purchase ? (
                    <Badge className="gap-1" variant="secondary">
                      <ShieldCheck aria-hidden="true" className="size-3" />
                      {t("verified")}
                    </Badge>
                  ) : null}
                </div>
                {review.comment?.trim() ? (
                  <p className="whitespace-pre-line text-muted-foreground leading-relaxed">
                    {review.comment.trim()}
                  </p>
                ) : null}
                <ReviewPhotos
                  label={t("photoAlt", {
                    name: review.author_name?.trim() || t("anonymous"),
                  })}
                  photos={review.photos ?? []}
                />
                {/* Verified buyers earn Bulbs for a photo; say so. */}
                {review.verified_purchase &&
                (review.photos?.length ?? 0) > 0 ? (
                  <p className="text-muted-foreground text-xs">
                    {t("photoBonus")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
};
