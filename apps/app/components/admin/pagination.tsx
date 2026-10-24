import { Button } from "@repo/design-system/components/ui/button";
import { formatNumber } from "@repo/internationalization/format";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { pageCount, type SearchParams, withParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";

interface PaginationProps {
  readonly count: number | null;
  readonly page: number;
  readonly params: SearchParams;
  readonly pathname: string;
  readonly size?: number;
}

/** Previous/next links that keep the current filters. */
export const Pagination = async ({
  count,
  page,
  params,
  pathname,
  size,
}: PaginationProps) => {
  const pages = pageCount(count, size);
  if (pages <= 1) {
    return null;
  }
  const t = await getTranslations("admin.list");
  const locale = (await getLocale()) as "ar" | "en";

  return (
    <nav className="flex items-center justify-between gap-2 text-sm">
      <span className="text-muted-foreground">
        {t("page", {
          page: formatNumber(page, locale),
          pages: formatNumber(pages, locale),
        })}
      </span>
      <span className="flex gap-2">
        <Button
          asChild={page > 1}
          disabled={page <= 1}
          size="sm"
          variant="outline"
        >
          {page > 1 ? (
            <Link href={`${pathname}${withParams(params, { page: page - 1 })}`}>
              <ChevronLeftIcon className="rtl:rotate-180" />
              {t("previous")}
            </Link>
          ) : (
            <span>
              <ChevronLeftIcon className="rtl:rotate-180" />
              {t("previous")}
            </span>
          )}
        </Button>
        <Button
          asChild={page < pages}
          disabled={page >= pages}
          size="sm"
          variant="outline"
        >
          {page < pages ? (
            <Link href={`${pathname}${withParams(params, { page: page + 1 })}`}>
              {t("next")}
              <ChevronRightIcon className="rtl:rotate-180" />
            </Link>
          ) : (
            <span>
              {t("next")}
              <ChevronRightIcon className="rtl:rotate-180" />
            </span>
          )}
        </Button>
      </span>
    </nav>
  );
};
