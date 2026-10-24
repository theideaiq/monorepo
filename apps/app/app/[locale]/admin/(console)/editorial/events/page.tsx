import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { EditorialTabs } from "../_components/editorial-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.tabs");
  return { title: t("events") };
};

const EventsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("editorial");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const { count, data: events } = await supabase
    .from("events")
    .select(
      "id, slug, title_ar, title_en, starts_at, location, capacity, published, event_rsvps(count)",
      { count: "exact" }
    )
    .order("starts_at", { ascending: false })
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/editorial/events/new">
              <PlusIcon />
              {t("events.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <EditorialTabs />
      <PageBody>
        {(events ?? []).length === 0 ? (
          <EmptyState title={t("events.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("events.title")}</TableHead>
                  <TableHead>{t("events.startsAt")}</TableHead>
                  <TableHead>{t("events.location")}</TableHead>
                  <TableHead className="text-end">
                    {t("events.rsvps")}
                  </TableHead>
                  <TableHead>{t("publish.state")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(events ?? []).map((event) => {
                  const rsvps = event.event_rsvps[0]?.count ?? 0;
                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/editorial/events/${event.id}`}
                        >
                          {localized(event, "title", locale)}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(event.starts_at)}
                      </TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell className="text-end tabular-nums">
                        {event.capacity
                          ? t("events.seats", {
                              capacity: format.number(event.capacity),
                              count: format.number(rsvps),
                            })
                          : format.number(rsvps)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={event.published ? "published" : "draft"}
                        >
                          {event.published
                            ? t("publish.states.published")
                            : t("publish.states.draft")}
                        </StatusBadge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/editorial/events"
        />
      </PageBody>
    </>
  );
};

export default EventsPage;
