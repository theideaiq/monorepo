"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { localePath } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ChevronRightIcon, LifeBuoyIcon, PlusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState, SectionSpinner } from "@/components/states";
import { TicketStatusBadge } from "@/components/support/ticket-status-badge";
import { useTickets } from "@/lib/support-queries";

export const ticketHref = (id: string) => `/help/${encodeURIComponent(id)}`;

/**
 * The signed-in member's support tickets on /help, most recent activity
 * first, with "New ticket"; signed out, a way to sign in and open one.
 */
export const Support = () => {
  const { loading, user } = useAuth();
  const t = useTranslations("app.support");
  const locale = useLocale();

  if (loading) {
    return null;
  }
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-bold text-xl">{t("title")}</h2>
      {user ? (
        <SupportTickets />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-5">
          <p className="text-muted-foreground">{t("signedOut")}</p>
          <Button asChild>
            <Link
              href={{
                pathname: "/sign-in",
                query: { return_to: localePath(locale, "/help/new") },
              }}
            >
              {t("newTicket")}
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
};

const SupportTickets = () => {
  const t = useTranslations("app.support");
  const tTopic = useTranslations("store.ticketTopic");
  const locale = useLocale();
  const tickets = useTickets();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">{t("description")}</p>
        <Button asChild>
          <Link href="/help/new">
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
              <Link href="/help/new">{t("newTicket")}</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}
      {tickets.data?.length ? (
        <ul className="divide-y rounded-lg border">
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
                  <span className="truncate font-medium">{ticket.subject}</span>
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
  );
};
