"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ChevronRightIcon, LifeBuoyIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { TicketStatusBadge } from "@/components/support/ticket-status-badge";
import { useTickets } from "@/lib/support-queries";

export const ticketHref = (id: string) =>
  `/support/${encodeURIComponent(id)}`;

/** /support: the customer's tickets, most recent activity first. */
export const Support = () => {
  const t = useTranslations("app.support");
  const tTopic = useTranslations("store.ticketTopic");
  const locale = useLocale();
  const tickets = useTickets();

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6 p-4 pt-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground">{t("description")}</p>
          <Button asChild>
            <Link href="/support/new">
              <PlusIcon />
              {t("newTicket")}
            </Link>
          </Button>
        </div>
        {tickets.isPending ? <SectionSpinner /> : null}
        {tickets.isError ? (
          <ErrorState onRetry={() => tickets.refetch()} />
        ) : null}
        {tickets.data?.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LifeBuoyIcon />
              </EmptyMedia>
              <EmptyTitle>{t("empty.title")}</EmptyTitle>
              <EmptyDescription>{t("empty.description")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild variant="outline">
                <Link href="/support/new">{t("newTicket")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {tickets.data?.length ? (
          <ul className="divide-y rounded-xl border">
            {tickets.data.map((ticket) => (
              <li key={ticket.id}>
                <Link
                  className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/50"
                  href={ticketHref(ticket.id)}
                >
                  <div className="grid min-w-0 flex-1 gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {t("number", { number: String(ticket.number) })}
                      </span>
                      <TicketStatusBadge status={ticket.status} />
                    </div>
                    <span className="truncate font-medium">
                      {ticket.subject}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {tTopic(ticket.topic)} ·{" "}
                      {t("lastActivity", {
                        date: formatDateTime(ticket.last_message_at, locale),
                      })}
                    </span>
                  </div>
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" />
                  <span className="sr-only">{t("openTicket")}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};
