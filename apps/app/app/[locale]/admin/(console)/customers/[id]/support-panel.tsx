import { getTranslations } from "next-intl/server";
import { Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import type { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { type TicketStatus, ticketStatusTone } from "@/lib/admin/support";
import { OpenTicketForm } from "./open-ticket-form";

interface TicketRow {
  id: string;
  last_message_at: string;
  number: number;
  status: TicketStatus;
  subject: string;
}

/** The customer's latest tickets and, for support, a form to open one. */
export const SupportPanel = async ({
  canOpen,
  customerId,
  format,
  orders,
  tickets,
}: {
  readonly canOpen: boolean;
  readonly customerId: string;
  readonly format: ReturnType<typeof formatters>;
  readonly orders: { id: string; number: number }[];
  readonly tickets: TicketRow[];
}) => {
  const t = await getTranslations("admin.customers.support");
  const tSupport = await getTranslations("admin.support");

  return (
    <Panel title={t("title")}>
      {tickets.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <ul className="grid gap-2 text-sm">
          {tickets.map((ticket) => (
            <li className="flex flex-wrap items-center gap-2" key={ticket.id}>
              <Link
                className="font-medium hover:underline"
                href={`/support/${ticket.id}`}
              >
                <span dir="ltr">#{ticket.number}</span> {ticket.subject}
              </Link>
              <StatusBadge tone={ticketStatusTone[ticket.status]}>
                {tSupport(`statuses.${ticket.status}`)}
              </StatusBadge>
              <span className="text-muted-foreground text-xs">
                {format.date(ticket.last_message_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canOpen ? (
        <details className="grid gap-4 border-t pt-4">
          <summary className="cursor-pointer font-medium text-sm">
            {t("openTitle")}
          </summary>
          <div className="pt-4">
            <OpenTicketForm customerId={customerId} orders={orders} />
          </div>
        </details>
      ) : null}
    </Panel>
  );
};
