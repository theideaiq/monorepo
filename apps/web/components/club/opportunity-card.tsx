import { localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { Briefcase, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CoverImage } from "@/components/cover-image";
import { opportunityPath } from "@/lib/club";
import { editorialUrl, type OpportunityRow } from "@/lib/data";

/** Whether an opportunity is featured now (the paid extra). */
export const isFeatured = (row: Pick<OpportunityRow, "featured_until">) =>
  Boolean(row.featured_until && new Date(row.featured_until) > new Date());

/**
 * An opportunity in Club → Join: its kind, who runs it, where, and when it
 * opens or closes.
 */
export const OpportunityCard = async ({
  locale,
  opportunity,
}: {
  readonly locale: Locale;
  readonly opportunity: OpportunityRow;
}) => {
  const t = await getTranslations({ locale, namespace: "web.opportunities" });
  const title = localized(opportunity, "title", locale);
  const summary = localized(opportunity, "summary", locale);
  const cover = editorialUrl(opportunity.cover_image);
  const opensLater =
    opportunity.opens_at && new Date(opportunity.opens_at) > new Date();

  let when = t("rolling");
  if (opensLater && opportunity.opens_at) {
    when = t("opens", { date: formatDate(opportunity.opens_at, locale) });
  } else if (opportunity.deadline) {
    when = t("closes", { date: formatDate(opportunity.deadline, locale) });
  }

  return (
    <Link
      className="group flex w-full flex-col gap-3 rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
      href={opportunityPath(opportunity.slug)}
    >
      {cover ? <CoverImage alt={title} src={cover} /> : null}
      <div className="flex flex-col gap-2 px-1 pb-1">
        <p className="flex flex-wrap items-center gap-2 font-medium text-pink-text text-xs">
          <Briefcase aria-hidden="true" className="size-4" />
          {t(`kinds.${opportunity.kind}`)}
          {isFeatured(opportunity) ? (
            <Badge variant="secondary">{t("featured")}</Badge>
          ) : null}
        </p>
        <h3 className="font-semibold text-lg leading-snug group-hover:text-pink-text">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm">
          {t("runBy", { name: opportunity.host_name ?? t("theIdea") })}
        </p>
        {summary ? (
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {summary}
          </p>
        ) : null}
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-sm">
          <span className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            {opportunity.remote && !opportunity.location
              ? t("online")
              : opportunity.location}
          </span>
          <span>{when}</span>
        </p>
      </div>
    </Link>
  );
};
