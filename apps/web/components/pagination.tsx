import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface PaginationProps {
  readonly hasNext: boolean;
  readonly hrefFor: (page: number) => string;
  readonly locale: Locale;
  readonly page: number;
}

/** Previous / next links for lists paginated through the URL. */
export const Pagination = async ({
  hasNext,
  hrefFor,
  locale,
  page,
}: PaginationProps) => {
  if (page <= 1 && !hasNext) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.ui" });

  return (
    <nav
      aria-label={t("pagination")}
      className="mt-10 flex items-center justify-center gap-4"
    >
      {page > 1 ? (
        <Button asChild variant="outline">
          <Link href={hrefFor(page - 1)} rel="prev">
            <ChevronLeft className="size-4 rtl:rotate-180" />
            {t("previous")}
          </Link>
        </Button>
      ) : null}
      <span className="text-muted-foreground text-sm">
        {t("pageOf", { page: formatNumber(page, locale) })}
      </span>
      {hasNext ? (
        <Button asChild variant="outline">
          <Link href={hrefFor(page + 1)} rel="next">
            {t("next")}
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Link>
        </Button>
      ) : null}
    </nav>
  );
};
