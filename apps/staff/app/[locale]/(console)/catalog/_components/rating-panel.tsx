import { Button } from "@repo/design-system/components/ui/button";
import { StarIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Panel } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import type { RatingSummary } from "@/lib/admin/reviews";

/** The product's average rating and the spread of its published reviews. */
export const RatingPanel = async ({
  productId,
  showReviews,
  summary,
}: {
  readonly productId: string;
  readonly showReviews: boolean;
  readonly summary: RatingSummary;
}) => {
  const t = await getTranslations("admin.catalog.ratings");
  const format = formatters(await getLocale());

  return (
    <Panel
      actions={
        showReviews ? (
          <Button asChild size="sm" variant="outline">
            <Link href={`/catalog/reviews?product=${productId}`}>
              {t("manage")}
            </Link>
          </Button>
        ) : null
      }
      description={
        summary.hidden > 0
          ? t("hidden", { count: format.number(summary.hidden) })
          : undefined
      }
      title={t("title")}
    >
      {summary.average === null ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="grid justify-items-center gap-1 px-4">
            <span className="flex items-center gap-2 font-semibold text-3xl tabular-nums">
              {format.number(summary.average)}
              <StarIcon className="size-6 fill-bulb-yellow text-warning" />
            </span>
            <span className="text-muted-foreground text-sm">
              {t("count", { count: format.number(summary.published) })}
            </span>
          </div>
          <ul className="grid gap-1.5">
            {summary.byRating.map((row) => (
              <li
                className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 text-sm"
                key={row.rating}
              >
                <span className="tabular-nums">
                  {t("stars", { rating: format.number(row.rating) })}
                </span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-bulb-yellow"
                    style={{ width: `${Math.round(row.share * 100)}%` }}
                  />
                </span>
                <span className="text-end text-muted-foreground tabular-nums">
                  {format.number(row.count)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};
