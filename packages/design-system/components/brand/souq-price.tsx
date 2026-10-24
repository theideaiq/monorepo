import { cn } from "../../lib/utils";

/** A market price is shown only if it was checked in the last 7 days. */
export const MARKET_PRICE_MAX_AGE_DAYS = 7;

const DAY_MS = 86_400_000;

/** Whether a market price checked at `checkedAt` may still be shown. */
export const isMarketPriceFresh = (
  checkedAt: Date | string | null | undefined,
  now: Date = new Date()
) => {
  if (!checkedAt) {
    return false;
  }
  const checked = new Date(checkedAt).getTime();
  const age = now.getTime() - checked;
  return (
    Number.isFinite(checked) &&
    age >= 0 &&
    age <= MARKET_PRICE_MAX_AGE_DAYS * DAY_MS
  );
};

interface SouqPriceProps {
  /** When the market price was checked; without one it isn't shown. */
  readonly checkedAt?: Date | string | null;
  readonly className?: string;
  /**
   * The words around the numbers, from the messages files: `market`
   * ("بالسوگ بـ" / "In the market"), `withUs` ("يمنا بـ" / "With us") and
   * `currency` ("دينار عراقي" / "IQD").
   */
  readonly labels: { currency: string; market: string; withUs: string };
  /** The checked market price, already formatted (Latin digits). */
  readonly marketPrice?: string | null;
  /** For tests: the time to judge freshness against. */
  readonly now?: Date;
  /** Our price, already formatted (Latin digits, thousands separators). */
  readonly price: string;
  /** `lg` sets our number at 24px and up (yellow on pink grounds). */
  readonly size?: "lg" | "md";
}

/**
 * The souq price: the market price small and struck through, then ours
 * large and bold. The market line only renders when a market price was
 * checked in the last 7 days (comparison prices are advertising claims).
 */
export const SouqPrice = ({
  checkedAt,
  className,
  labels,
  marketPrice,
  now,
  price,
  size = "md",
}: SouqPriceProps) => {
  const showMarket = Boolean(marketPrice) && isMarketPriceFresh(checkedAt, now);

  return (
    <span
      className={cn("inline-flex flex-col items-start gap-0.5", className)}
      data-slot="souq-price"
    >
      {showMarket ? (
        <span className="text-ink-muted text-small group-data-[ground=pink]/ground:text-on-pink">
          {labels.market}{" "}
          <s className="font-mono tabular-nums" dir="ltr">
            {marketPrice}
          </s>
        </span>
      ) : null}
      <span
        className={cn(
          "font-bold",
          size === "lg" ? "text-h3 md:text-h2" : "text-body"
        )}
      >
        {labels.withUs}{" "}
        <span
          className={cn(
            "font-mono text-pink-text tabular-nums",
            size === "lg"
              ? "group-data-[ground=pink]/ground:text-bulb-yellow"
              : "group-data-[ground=pink]/ground:text-on-pink"
          )}
          dir="ltr"
        >
          {price}
        </span>{" "}
        {labels.currency}
      </span>
    </span>
  );
};
