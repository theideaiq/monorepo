"use client";

import { cn } from "@repo/design-system/lib/utils";
import { formatNumber } from "@repo/internationalization/format";
import { StarIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId } from "react";
import type { Rating } from "@/lib/review-queries";

const STARS = [1, 2, 3, 4, 5] as const;

/** Five stars, filled up to `value` (rounded to the nearest star). */
export const Stars = ({
  className,
  value,
}: {
  readonly className?: string;
  readonly value: number;
}) => (
  <span aria-hidden="true" className="flex items-center gap-0.5">
    {STARS.map((star) => (
      <StarIcon
        className={cn(
          "size-3.5",
          star <= Math.round(value)
            ? "fill-bulb-yellow text-warning"
            : "text-muted-foreground/40",
          className
        )}
        key={star}
      />
    ))}
  </span>
);

/** "★★★★☆ 4.2 (12)", read out as a sentence. */
export const RatingSummary = ({
  className,
  rating,
}: {
  readonly className?: string;
  readonly rating: Rating;
}) => {
  const t = useTranslations("app.reviews");
  const locale = useLocale();
  const average = formatNumber(rating.average, locale, {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  const count = formatNumber(rating.count, locale);

  return (
    <span
      className={cn("flex items-center gap-1.5 text-xs", className)}
      title={t("summaryLabel", { average, count })}
    >
      <Stars value={rating.average} />
      <span aria-hidden="true" className="text-muted-foreground tabular-nums">
        {t("summary", { average, count })}
      </span>
      <span className="sr-only">{t("summaryLabel", { average, count })}</span>
    </span>
  );
};

/** Choosing 1–5 stars, as native radio buttons drawn as stars. */
export const StarInput = ({
  onChange,
  value,
}: {
  readonly onChange: (value: number) => void;
  readonly value: number;
}) => {
  const t = useTranslations("app.reviews.form");
  const locale = useLocale();
  const name = useId();

  return (
    <fieldset className="grid gap-1">
      <legend className="mb-1 font-medium text-sm">{t("rating")}</legend>
      <div className="flex items-center gap-1">
        {STARS.map((star) => (
          <label
            className="cursor-pointer rounded-sm p-0.5 has-focus-visible:ring-2 has-focus-visible:ring-ring"
            key={star}
          >
            <input
              aria-label={t("stars", { count: formatNumber(star, locale) })}
              checked={value === star}
              className="sr-only"
              name={name}
              onChange={() => onChange(star)}
              type="radio"
              value={star}
            />
            <StarIcon
              aria-hidden="true"
              className={cn(
                "size-7 transition-colors",
                star <= value
                  ? "fill-bulb-yellow text-warning"
                  : "text-muted-foreground/50 hover:text-warning"
              )}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
};
