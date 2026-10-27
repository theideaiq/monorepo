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
import { NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { oneOf, pageRange, type SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { TelegramTabs } from "./_components/telegram-tabs";
import { resolveRequest } from "./actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.telegram");
  return { title: t("title") };
};

const statuses = ["open", "resolved", "rejected"] as const;

/** Support requests people sent to the bot (and older unban requests). */
const RequestsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, supabase } = await requireSection("telegram");
  const params = await searchParams;
  const t = await getTranslations("admin.telegram");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);
  const status = oneOf(params, "status", statuses) ?? "open";

  const { count, data: requests } = await supabase
    .from("telegram_requests")
    .select(
      "id, type, message, status, created_at, telegram_members(id, username, first_name, last_name, banned_at)",
      { count: "exact" }
    )
    .eq("status", status)
    .order("created_at", { ascending: status === "open" })
    .range(from, to);

  return (
    <>
      <PageHeader title={t("title")} />
      <TelegramTabs />
      <PageBody>
        <FilterBar>
          <NativeSelect
            aria-label={t("requests.status")}
            className="w-auto"
            defaultValue={status}
            name="status"
            options={statuses.map((value) => ({
              label: t(`requests.statuses.${value}`),
              value,
            }))}
          />
        </FilterBar>
        {(requests ?? []).length === 0 ? (
          <EmptyState title={t("requests.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("requests.member")}</TableHead>
                  <TableHead>{t("requests.type")}</TableHead>
                  <TableHead>{t("requests.message")}</TableHead>
                  <TableHead>{t("requests.date")}</TableHead>
                  <TableHead className="text-end">
                    {t("requests.status")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requests ?? []).map((request) => {
                  const member = request.telegram_members;
                  const name = [member?.first_name, member?.last_name]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <span className="block">{name || "—"}</span>
                        {member?.username ? (
                          <span
                            className="block text-muted-foreground text-xs"
                            dir="ltr"
                          >
                            @{member.username}
                          </span>
                        ) : null}
                        {member?.banned_at ? (
                          <StatusBadge tone="danger">
                            {t("members.banned")}
                          </StatusBadge>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {t(`requests.types.${request.type}`)}
                      </TableCell>
                      <TableCell
                        className="max-w-md whitespace-pre-wrap"
                        dir="auto"
                      >
                        {request.message}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(request.created_at)}
                      </TableCell>
                      <TableCell className="text-end">
                        {canWrite && request.status === "open" ? (
                          <span className="flex justify-end gap-2">
                            <ActionButton
                              action={resolveRequest}
                              fields={{ id: request.id, status: "resolved" }}
                              variant="default"
                            >
                              {request.type === "unban"
                                ? t("requests.approveUnban")
                                : t("requests.resolve")}
                            </ActionButton>
                            <ActionButton
                              action={resolveRequest}
                              confirm={{ title: t("requests.rejectConfirm") }}
                              fields={{ id: request.id, status: "rejected" }}
                              variant="outline"
                            >
                              {t("requests.reject")}
                            </ActionButton>
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-2">
                            <StatusBadge status={request.status}>
                              {t(`requests.statuses.${request.status}`)}
                            </StatusBadge>
                            {canWrite ? (
                              <ActionButton
                                action={resolveRequest}
                                fields={{ id: request.id, status: "open" }}
                                variant="ghost"
                              >
                                {t("requests.reopen")}
                              </ActionButton>
                            ) : null}
                          </span>
                        )}
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
          pathname="/club/telegram"
        />
      </PageBody>
    </>
  );
};

export default RequestsPage;
