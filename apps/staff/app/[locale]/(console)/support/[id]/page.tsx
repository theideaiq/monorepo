import { cn } from "@repo/design-system/lib/utils";
import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  DetailList,
  MaybeLink,
  PageBody,
  Panel,
} from "@/components/admin/page";
import { RecordHeader } from "@/components/admin/record-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { ticketPriorityTone, ticketStatusTone } from "@/lib/admin/support";
import { supportStaff } from "@/lib/admin/support-staff";
import { ManageTicketForm, ReplyForm } from "./ticket-forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.support");
  return { title: t("detail") };
};

/** One ticket: the customer, the linked order and the whole thread. */
const TicketPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("support");
  const t = await getTranslations("admin.support");
  const tNav = await getTranslations("admin.nav");
  const tStore = await getTranslations("store");
  const format = formatters(await getLocale());

  const [{ data: ticket }, { data: messages }, team] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*, orders(id, number, status, total)")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("support_messages")
      .select("id, author_id, body, internal, created_at")
      .eq("ticket_id", id)
      .order("created_at", { ascending: true }),
    supportStaff(supabase),
  ]);

  if (!ticket) {
    notFound();
  }

  const thread = messages ?? [];
  const names = await profileNames(supabase, [
    ticket.user_id,
    ...thread.map((message) => message.author_id),
  ]);
  const customerName = ticket.user_id
    ? names.get(ticket.user_id) || t("unnamedCustomer")
    : t("deletedCustomer");
  const order = ticket.orders;
  const canSeeCustomer = canRead(staff.role, "customers");
  const canSeeOrder = canRead(staff.role, "orders");

  return (
    <>
      <RecordHeader
        breadcrumb={[
          { href: "/", label: tNav("dashboard") },
          { href: "/support", label: t("title") },
        ]}
        chips={
          <>
            <StatusBadge tone={ticketStatusTone[ticket.status]}>
              {t(`statuses.${ticket.status}`)}
            </StatusBadge>
            <StatusBadge tone={ticketPriorityTone[ticket.priority]}>
              {t(`priorities.${ticket.priority}`)}
            </StatusBadge>
          </>
        }
        description={t("openedOn", {
          date: format.dateTime(ticket.created_at),
        })}
        numbers={[
          {
            label: t("messages"),
            value: format.number(thread.length),
          },
          { label: t("customer"), value: customerName },
          {
            label: t("lastMessage"),
            value: format.dateTime(ticket.last_message_at),
          },
        ]}
        tabs={[
          { href: "#thread", label: t("thread") },
          { href: "#manage", label: t("manage") },
        ]}
        title={`${t("number", { number: String(ticket.number) })} · ${ticket.subject}`}
      />
      <PageBody className="lg:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-6">
          <Panel id="thread" title={t("thread")}>
            {thread.length === 0 ? (
              <p className="text-muted-foreground text-sm">{t("noMessages")}</p>
            ) : (
              <ol className="grid gap-3">
                {thread.map((message) => {
                  const fromCustomer =
                    message.author_id !== null &&
                    message.author_id === ticket.user_id;
                  const author = message.author_id
                    ? names.get(message.author_id) ||
                      (fromCustomer ? t("unnamedCustomer") : t("unnamedStaff"))
                    : t("deletedAuthor");
                  return (
                    <li
                      className={cn(
                        "grid gap-2 rounded-md border p-3",
                        fromCustomer && "bg-muted/40",
                        !(fromCustomer || message.internal) &&
                          "border-primary/30 bg-primary/5",
                        message.internal &&
                          "border-warning/50 border-dashed bg-warning/10"
                      )}
                      key={message.id}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="flex items-center gap-2 font-medium text-sm">
                          {author}
                          {fromCustomer ? (
                            <StatusBadge>{t("customerBadge")}</StatusBadge>
                          ) : (
                            <StatusBadge tone="brand">
                              {t("staffBadge")}
                            </StatusBadge>
                          )}
                          {message.internal ? (
                            <StatusBadge tone="warning">
                              <LockIcon className="me-1 size-3" />
                              {t("internalBadge")}
                            </StatusBadge>
                          ) : null}
                        </span>
                        <time
                          className="text-muted-foreground"
                          dateTime={message.created_at}
                        >
                          {format.dateTime(message.created_at)}
                        </time>
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {message.body}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
          {canWrite ? (
            <Panel>
              <ReplyForm
                closed={ticket.status === "closed"}
                ticketId={ticket.id}
              />
            </Panel>
          ) : null}
        </div>

        <div className="grid content-start gap-6">
          <Panel title={t("details")}>
            <DetailList
              items={[
                {
                  label: t("customer"),
                  value: (
                    <MaybeLink
                      href={
                        ticket.user_id && canSeeCustomer
                          ? `/customers/${ticket.user_id}`
                          : null
                      }
                    >
                      {customerName}
                    </MaybeLink>
                  ),
                },
                { label: t("topic"), value: t(`topics.${ticket.topic}`) },
                {
                  label: t("order"),
                  value: order ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <MaybeLink
                        href={canSeeOrder ? `/orders/${order.id}` : null}
                      >
                        {t("number", { number: String(order.number) })}
                      </MaybeLink>
                      <StatusBadge status={order.status}>
                        {tStore(`orderStatus.${order.status}`)}
                      </StatusBadge>
                      <span className="text-muted-foreground tabular-nums">
                        {format.money(order.total)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      {t("noOrder")}
                    </span>
                  ),
                },
                {
                  label: t("lastMessage"),
                  value: format.dateTime(ticket.last_message_at),
                },
              ]}
            />
          </Panel>
          <Panel id="manage" title={t("manage")}>
            <ManageTicketForm
              assignedTo={ticket.assigned_to}
              disabled={!canWrite}
              key={`${ticket.status}-${ticket.priority}-${ticket.assigned_to}`}
              priority={ticket.priority}
              status={ticket.status}
              team={team}
              ticketId={ticket.id}
            />
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default TicketPage;
