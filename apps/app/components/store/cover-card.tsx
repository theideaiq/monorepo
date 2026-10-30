"use client";

import { hasPriceRange, localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import { cn } from "@repo/design-system/lib/utils";
import { Link } from "@repo/internationalization/navigation";
import {
  CheckCircle2Icon,
  ClockIcon,
  HourglassIcon,
  type LucideIcon,
  SparklesIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Availability } from "@/lib/plus";
import { Price } from "./price";
import { productHref } from "./product-card";
import { ProductImage } from "./product-image";

const AVAILABILITY_ICON: Record<Availability, LucideIcon> = {
  coming: SparklesIcon,
  long: HourglassIcon,
  now: CheckCircle2Icon,
  short: ClockIcon,
};

/** Plus availability in a word, with its icon ("Short wait"). */
export const AvailabilityWord = ({
  className,
  value,
}: {
  readonly className?: string;
  readonly value: Availability;
}) => {
  const t = useTranslations("store.availability");
  const Icon = AVAILABILITY_ICON[value];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        value === "now" ? "font-medium text-success" : "text-muted-foreground",
        className
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {t(value)}
    </span>
  );
};

/** The small Plus mark on a cover: yellow on pink. */
export const PlusMark = ({ className }: { readonly className?: string }) => {
  const t = useTranslations("store.cover");
  return (
    <span
      className={cn(
        "rounded-full bg-idea-pink px-2 py-0.5 font-bold text-bulb-yellow text-xs",
        className
      )}
      title={t("inPlus")}
    >
      <span aria-hidden="true">{t("plusMark")}</span>
      <span className="sr-only">{t("inPlus")}</span>
    </span>
  );
};

interface CoverCardProps {
  /** On Plus surfaces: the availability word instead of the price. */
  readonly availability?: Availability | null;
  /** The plan it needs, when above the entry plan ("Needs Blaze"). */
  readonly needsPlan?: string | null;
  /** A Plus surface: availability, no price and no Plus mark. */
  readonly plus?: boolean;
  readonly product: ProductCard;
}

/**
 * A cover card: the cover art first, the title, then the price in mono
 * with a small Plus mark when the product is in Plus (on the Store), or
 * its availability in words (on Plus).
 */
export const CoverCard = ({
  availability,
  needsPlan,
  plus = false,
  product,
}: CoverCardProps) => {
  const locale = useLocale();
  const t = useTranslations("store.cover");
  const name = localized(product, "name", locale);
  return (
    <Link
      className="group grid w-full content-start gap-2 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
      href={productHref(product.slug)}
    >
      <div className="relative">
        <ProductImage
          alt={name}
          className="transition-opacity group-hover:opacity-90"
          path={product.images[0]}
          sizes="(min-width: 1024px) 20vw, 45vw"
        />
        {product.rentable && !plus ? (
          <PlusMark className="absolute end-2 top-2" />
        ) : null}
      </div>
      <span className="line-clamp-2 font-medium text-sm">{name}</span>
      {plus ? (
        <span className="grid gap-0.5">
          {availability ? <AvailabilityWord value={availability} /> : null}
          {needsPlan ? (
            <span className="text-muted-foreground text-xs">
              {t("needsPlan", { plan: needsPlan })}
            </span>
          ) : null}
        </span>
      ) : (
        <Price
          className="text-sm"
          compareAtPrice={product.compare_at_price}
          from={hasPriceRange(product.variants)}
          price={product.price}
        />
      )}
    </Link>
  );
};
