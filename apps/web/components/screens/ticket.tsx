"use client";

import { useAuth } from "@repo/auth/provider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Button } from "@repo/design-system/components/ui/button";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { cn } from "@repo/design-system/lib/utils";
import { formatDateTime } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { TicketStatusBadge } from "@/components/support/ticket-status-badge";
import { toSupportError } from "@/lib/errors";
import { orderPath } from "@/lib/order-checkout";
import {
  canReply,
  MAX_MESSAGE_LENGTH,
  type TicketStatus,
  useCloseTicket,
  useReplyToTicket,
  useTicket,
  useTicketMessages,
} from "@/lib/support-queries";

const Messages = ({ ticketId }: { readonly ticketId: string }) => {
  const t = useTranslations("app.support.view");
  const locale = useLocale();
  const { user } = useAuth();
  const messages = useTicketMessages(ticketId);

  if (messages.isPending) {
    return <SectionSpinner />;
  }
  if (messages.isError) {
    return <ErrorState onRetry={() => messages.refetch()} />;
  }

  return (
    <ol className="grid gap-3">
      {(messages.data ?? []).map((message) => {
        const mine = message.author_id === user?.id;
        return (
          <li
            className={cn(
              "grid max-w-[85%] gap-1 rounded-lg p-3 text-sm",
              mine
                ? "justify-self-end bg-primary/10"
                : "justify-self-start border bg-card"
            )}
            key={message.id}
          >
            <span className="font-medium text-xs">
              {mine ? t("you") : t("team")}
            </span>
            <p className="whitespace-pre-line break-words">{message.body}</p>
            <time
              className="text-muted-foreground text-xs"
              dateTime={message.created_at}
            >
              {formatDateTime(message.created_at, locale)}
            </time>
          </li>
        );
      })}
    </ol>
  );
};

const Reply = ({
  status,
  ticketId,
}: {
  readonly status: TicketStatus;
  readonly ticketId: string;
}) => {
  const t = useTranslations("app.support");
  const reply = useReplyToTicket(ticketId);
  const [body, setBody] = useState("");
  const open = canReply(status);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!body.trim()) {
      return;
    }
    reply.mutate(body, { onSuccess: () => setBody("") });
  };

  return (
    <form className="grid gap-2" onSubmit={submit}>
      <Label htmlFor="ticket-reply">{t("view.reply")}</Label>
      <Textarea
        disabled={!open}
        id="ticket-reply"
        maxLength={MAX_MESSAGE_LENGTH}
        onChange={(event) => setBody(event.target.value)}
        placeholder={open ? t("view.replyPlaceholder") : t("view.closed")}
        rows={4}
        value={body}
      />
      <Button
        className="justify-self-start"
        disabled={!(open && body.trim()) || reply.isPending}
        type="submit"
      >
        {reply.isPending ? t("view.sending") : t("view.send")}
      </Button>
      {reply.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${toSupportError(reply.error)}`)}
        </p>
      ) : null}
    </form>
  );
};

const CloseTicket = ({ ticketId }: { readonly ticketId: string }) => {
  const t = useTranslations("app.support");
  const close = useCloseTicket();

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={close.isPending} size="sm" variant="outline">
            {close.isPending ? t("view.closing") : t("view.close")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("view.closeTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("view.closeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("view.keepOpen")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => close.mutate(ticketId)}>
              {t("view.closeConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {close.isError ? (
        <p className="basis-full text-destructive text-sm" role="alert">
          {t(`errors.${toSupportError(close.error)}`)}
        </p>
      ) : null}
    </>
  );
};

interface TicketProps {
  readonly ticketId: string;
}

/** /support/<id>: a ticket's conversation. */
export const Ticket = ({ ticketId }: TicketProps) => {
  const t = useTranslations("app.support");
  const tTopic = useTranslations("store.ticketTopic");
  const tCommon = useTranslations("app.common");
  const ticket = useTicket(ticketId);
  const { data } = ticket;

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        <Link
          className="inline-flex items-center gap-1 self-start text-muted-foreground text-sm hover:text-foreground"
          href="/help"
        >
          <ArrowLeftIcon className="size-4 rtl:rotate-180" />
          {t("view.back")}
        </Link>
        {ticketId && ticket.isPending ? <SectionSpinner /> : null}
        {ticket.isError ? (
          <ErrorState onRetry={() => ticket.refetch()} />
        ) : null}
        {!ticketId || data === null ? (
          <p className="text-muted-foreground">{t("view.notFound")}</p>
        ) : null}
        {data ? (
          <>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground text-sm tabular-nums">
                  {t("number", { number: String(data.number) })}
                </span>
                <TicketStatusBadge status={data.status} />
                <span className="text-muted-foreground text-sm">
                  {tTopic(data.topic)}
                </span>
                {data.order ? (
                  <Link
                    className="text-pink-text text-sm hover:underline"
                    href={orderPath(data.order.id)}
                  >
                    {tCommon("orderNumber", {
                      number: String(data.order.number),
                    })}
                  </Link>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-xl tracking-tight">
                  {data.subject}
                </h2>
                {canReply(data.status) ? (
                  <CloseTicket ticketId={data.id} />
                ) : null}
              </div>
              <p className="text-muted-foreground text-sm">
                {t(`statusHint.${data.status}`)}
              </p>
            </div>
            <Messages ticketId={data.id} />
            <Reply status={data.status} ticketId={data.id} />
          </>
        ) : null}
      </div>
    </>
  );
};
