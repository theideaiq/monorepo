import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CatalogTabs } from "../_components/catalog-tabs";
import { clearSearchMiss } from "./actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.searches");
  return { title: t("title") };
};

const LIMIT = 200;

/**
 * Catalog → Searches: what people searched the Store for and found no
 * product (`search_misses`), most searched first. Staff add the product
 * or fix its names, then clear the term.
 */
const SearchesPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog.searches");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(await getLocale());

  const { data: misses } = await supabase
    .from("search_misses")
    .select("term, searches, first_seen, last_seen")
    .order("searches", { ascending: false })
    .order("last_seen", { ascending: false })
    .limit(LIMIT);

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <CatalogTabs />
      <PageBody>
        {(misses ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("term")}</TableHead>
                  <TableHead className="text-end">{t("searches")}</TableHead>
                  <TableHead>{t("lastSeen")}</TableHead>
                  <TableHead>{t("firstSeen")}</TableHead>
                  {canWrite ? (
                    <TableHead className="text-end">
                      {tCommon("actions")}
                    </TableHead>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {(misses ?? []).map((miss) => (
                  <TableRow key={miss.term}>
                    <TableCell dir="auto">
                      <Link
                        className="font-medium hover:underline"
                        href={`/catalog?q=${encodeURIComponent(miss.term)}`}
                      >
                        {miss.term}
                      </Link>
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(miss.searches)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(miss.last_seen)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(miss.first_seen)}
                    </TableCell>
                    {canWrite ? (
                      <TableCell>
                        <span className="flex justify-end">
                          <ActionButton
                            action={clearSearchMiss}
                            fields={{ term: miss.term }}
                          >
                            {t("clear")}
                          </ActionButton>
                        </span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default SearchesPage;
