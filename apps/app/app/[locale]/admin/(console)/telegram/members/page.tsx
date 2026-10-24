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
import { canRead } from "@/lib/admin/roles";
import { requireSection } from "@/lib/admin/session";
import { TelegramTabs } from "../_components/telegram-tabs";

const AT_PREFIX = /^@/;
export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.telegram.tabs");
  return { title: t("members") };
};

/** People who talked to the bot or in a moderated group. */
const MembersPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("telegram");
  const params = await searchParams;
  const t = await getTranslations("admin.telegram");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);
  const q = searchTerm(param(params, "q")).replace(AT_PREFIX, "");
  const banned = oneOf(params, "banned", ["yes", "no"] as const);

  let query = supabase
    .from("telegram_members")
    .select(
      "id, username, first_name, last_name, chat_status, banned_at, user_id, updated_at",
      { count: "exact" }
    )
    .order("updated_at", { ascending: false })
    .range(from, to);
  if (q) {
    query = query.or(
      `username.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    );
  }
  if (banned) {
    query =
      banned === "yes"
        ? query.not("banned_at", "is", null)
        : query.is("banned_at", null);
  }
  const { count, data: members } = await query;
  const linkCustomers = canRead(staff.role, "customers");

  return (
    <>
      <PageHeader title={t("title")} />
      <TelegramTabs />
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("members.search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("members.search")}
            type="search"
          />
          <NativeSelect
            aria-label={t("members.banStatus")}
            className="w-auto"
            defaultValue={banned ?? ""}
            name="banned"
            options={[
              { label: t("members.anyone"), value: "" },
              { label: t("members.banned"), value: "yes" },
              { label: t("members.notBanned"), value: "no" },
            ]}
          />
        </FilterBar>
        {(members ?? []).length === 0 ? (
          <EmptyState title={t("members.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("members.name")}</TableHead>
                  <TableHead>{t("members.groupStatus")}</TableHead>
                  <TableHead>{t("members.account")}</TableHead>
                  <TableHead>{t("members.lastSeen")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(members ?? []).map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <span className="block">
                        {[member.first_name, member.last_name]
                          .filter(Boolean)
                          .join(" ") || "—"}
                      </span>
                      <span
                        className="block text-muted-foreground text-xs"
                        dir="ltr"
                      >
                        {member.username ? `@${member.username}` : member.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {member.banned_at ? (
                        <StatusBadge tone="danger">
                          {t("members.banned")}
                        </StatusBadge>
                      ) : (
                        <span
                          className="text-muted-foreground text-sm"
                          dir="ltr"
                        >
                          {member.chat_status ?? "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {member.user_id && linkCustomers ? (
                        <Link
                          className="text-pink-text hover:underline"
                          href={`/customers/${member.user_id}`}
                        >
                          {t("members.linked")}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">
                          {member.user_id ? t("members.linked") : "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.date(member.updated_at)}
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
          pathname="/telegram/members"
        />
      </PageBody>
    </>
  );
};

export default MembersPage;
