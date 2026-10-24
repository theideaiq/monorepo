import { Input } from "@repo/design-system/components/ui/input";
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
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import {
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import {
  parseAssignee,
  parseTicketSearch,
  queueViews,
  statusesFor,
  ticketPriorities,
  ticketPriorityTone,
  ticketStatusTone,
  ticketTopics,
} from "@/lib/admin/support";
import { supportStaff } from "@/lib/admin/support-staff";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.support");
  return { title: t("title") };
};

/** The support queue: open tickets first, longest waiting first. */
const SupportPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("support");
  const params = await searchParams;
  const t = await getTranslations("admin.support");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);

  const view = oneOf(params, "status", queueViews) ?? "active";
  const priority = oneOf(params, "priority", ticketPriorities);
  const topic = oneOf(params, "topic", ticketTopics);
  const assigneeParam = param(params, "assignee");
  const assignee = parseAssignee(assigneeParam);
  const q = param(params, "q");
  const search = parseTicketSearch(q);

  let query = supabase
    .from("support_tickets")
    .select(
      "id, number, subject, topic, status, priority, user_id, assigned_to, last_message_at, created_at",
      { count: "exact" }
    )
    // ticket_status is declared open, pending, resolved, closed.
    .order("status", { ascending: true })
    .order("last_message_at", { ascending: true })
    .range(from, to);
  const statuses = statusesFor(view);
  if (statuses) {
    query = query.in("status", statuses);
  }
  if (priority) {
    query = query.eq("priority", priority);
  }
  if (topic) {
    query = query.eq("topic", topic);
  }
  if (assignee.kind === "me") {
    query = query.eq("assigned_to", staff.userId);
  } else if (assignee.kind === "none") {
    query = query.is("assigned_to", null);
  } else if (assignee.kind === "user") {
    query = query.eq("assigned_to", assignee.id);
  }
  if (search && "number" in search) {
    query = query.eq("number", search.number);
  } else if (search && searchTerm(search.subject)) {
    query = query.ilike("subject", `%${searchTerm(search.subject)}%`);
  }

  const [{ count, data }, team] = await Promise.all([
    query,
    supportStaff(supabase),
  ]);
  const tickets = data ?? [];
  const names = await profileNames(
    supabase,
    tickets.map((ticket) => ticket.user_id)
  );
  const teamNames = new Map(team.map((member) => [member.id, member.name]));

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("search")}
            type="search"
          />
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={view}
            name="status"
            options={queueViews.map((value) => ({
              label: t(`views.${value}`),
              value,
            }))}
          />
          <NativeSelect
            aria-label={t("priority")}
            className="w-auto"
            defaultValue={priority ?? ""}
            name="priority"
            options={[
              { label: t("anyPriority"), value: "" },
              ...ticketPriorities.map((value) => ({
                label: t(`priorities.${value}`),
                value,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("topic")}
            className="w-auto"
            defaultValue={topic ?? ""}
            name="topic"
            options={[
              { label: t("anyTopic"), value: "" },
              ...ticketTopics.map((value) => ({
                label: t(`topics.${value}`),
                value,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("assignee")}
            className="w-auto"
            defaultValue={assignee.kind === "any" ? "" : assigneeParam}
            name="assignee"
            options={[
              { label: t("anyAssignee"), value: "" },
              { label: t("assignedToMe"), value: "me" },
              { label: t("unassigned"), value: "none" },
              ...team
                .filter((member) => member.id !== staff.userId)
                .map((member) => ({
                  label: member.name ?? t("unnamedStaff"),
                  value: member.id,
                })),
            ]}
          />
        </FilterBar>

        {tickets.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ticket")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("topic")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("priority")}</TableHead>
                  <TableHead>{t("assignee")}</TableHead>
                  <TableHead>{t("lastMessage")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="max-w-80">
                      <Link
                        className="grid gap-0.5 hover:underline"
                        href={`/support/${ticket.id}`}
                      >
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {t("number", { number: String(ticket.number) })}
                        </span>
                        <span className="truncate font-medium">
                          {ticket.subject}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {ticket.user_id
                        ? names.get(ticket.user_id) || t("unnamedCustomer")
                        : t("deletedCustomer")}
                    </TableCell>
                    <TableCell>{t(`topics.${ticket.topic}`)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={ticketStatusTone[ticket.status]}>
                        {t(`statuses.${ticket.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={ticketPriorityTone[ticket.priority]}>
                        {t(`priorities.${ticket.priority}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {ticket.assigned_to ? (
                        (teamNames.get(ticket.assigned_to) ?? t("unnamedStaff"))
                      ) : (
                        <span className="text-muted-foreground">
                          {t("unassigned")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.dateTime(ticket.last_message_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/support"
        />
      </PageBody>
    </>
  );
};

export default SupportPage;
