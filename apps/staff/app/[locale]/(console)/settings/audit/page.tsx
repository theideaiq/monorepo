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
import { fromBaghdadInput } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import {
  isUuid,
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.audit");
  return { title: t("title") };
};

const ACTIONS = ["insert", "update", "delete"] as const;
const ENTITIES = [
  "crm_contacts",
  "events",
  "ledger_entries",
  "orders",
  "posts",
  "products",
  "rentals",
  "staff",
  "store_settings",
  "submissions",
  "telegram_chats",
  "telegram_requests",
] as const;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const describeMetadata = (metadata: unknown) => {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }
  const { changed, ...rest } = metadata as Record<string, unknown>;
  const parts: string[] = [];
  if (Array.isArray(changed) && changed.length > 0) {
    parts.push(changed.join(", "));
  }
  for (const [key, value] of Object.entries(rest)) {
    parts.push(
      `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`
    );
  }
  return parts.join(" · ");
};

/** Staff actions recorded by triggers and server code (admins). */
const AuditPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("audit");
  const params = await searchParams;
  const t = await getTranslations("admin.audit");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params, 50);

  const action = oneOf(params, "action", ACTIONS);
  const entity = oneOf(params, "entity", ENTITIES);
  const entityId = searchTerm(param(params, "id"));
  const actor = param(params, "actor");
  const since = param(params, "from");
  const until = param(params, "to");

  let query = supabase
    .from("audit_logs")
    .select(
      "id, actor_id, action, entity_type, entity_id, metadata, created_at",
      {
        count: "exact",
      }
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (action) {
    query = query.eq("action", action);
  }
  if (entity) {
    query = query.eq("entity_type", entity);
  }
  if (entityId) {
    query = query.eq("entity_id", entityId);
  }
  if (isUuid(actor)) {
    query = query.eq("actor_id", actor);
  }
  if (DATE.test(since)) {
    query = query.gte(
      "created_at",
      fromBaghdadInput(`${since}T00:00`) ?? since
    );
  }
  if (DATE.test(until)) {
    query = query.lte(
      "created_at",
      fromBaghdadInput(`${until}T23:59:59`) ?? until
    );
  }
  const { count, data: logs } = await query;
  const names = await profileNames(
    supabase,
    (logs ?? []).map((log) => log.actor_id)
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        <FilterBar>
          <NativeSelect
            aria-label={t("entity")}
            className="w-auto"
            defaultValue={entity ?? ""}
            name="entity"
            options={[
              { label: t("anyEntity"), value: "" },
              ...ENTITIES.map((value) => ({ label: value, value })),
            ]}
          />
          <NativeSelect
            aria-label={t("action")}
            className="w-auto"
            defaultValue={action ?? ""}
            name="action"
            options={[
              { label: t("anyAction"), value: "" },
              ...ACTIONS.map((value) => ({
                label: t(`actions.${value}`),
                value,
              })),
            ]}
          />
          <Input
            aria-label={t("entityId")}
            className="w-56"
            defaultValue={entityId}
            dir="ltr"
            name="id"
            placeholder={t("entityId")}
          />
          <Input
            aria-label={t("from")}
            className="w-auto"
            defaultValue={DATE.test(since) ? since : ""}
            name="from"
            type="date"
          />
          <Input
            aria-label={t("to")}
            className="w-auto"
            defaultValue={DATE.test(until) ? until : ""}
            name="to"
            type="date"
          />
          {isUuid(actor) ? (
            <input name="actor" type="hidden" value={actor} />
          ) : null}
        </FilterBar>
        {(logs ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("when")}</TableHead>
                  <TableHead>{t("who")}</TableHead>
                  <TableHead>{t("action")}</TableHead>
                  <TableHead>{t("entity")}</TableHead>
                  <TableHead>{t("details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(logs ?? []).map((log) => {
                  const known = (ACTIONS as readonly string[]).includes(
                    log.action
                  );
                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(log.created_at)}
                      </TableCell>
                      <TableCell>
                        {log.actor_id ? (
                          <a
                            className="hover:underline"
                            href={`?actor=${log.actor_id}`}
                          >
                            {names.get(log.actor_id) ?? t("unknownActor")}
                          </a>
                        ) : (
                          t("system")
                        )}
                      </TableCell>
                      <TableCell>
                        {known
                          ? t(
                              `actions.${log.action as (typeof ACTIONS)[number]}`
                            )
                          : log.action}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs" dir="ltr">
                          {log.entity_type}
                        </span>
                        {log.entity_id ? (
                          <span
                            className="block max-w-56 truncate font-mono text-muted-foreground text-xs"
                            dir="ltr"
                          >
                            {log.entity_id}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell
                        className="max-w-md truncate font-mono text-muted-foreground text-xs"
                        dir="ltr"
                      >
                        {describeMetadata(log.metadata)}
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
          pathname="/settings/audit"
          size={50}
        />
      </PageBody>
    </>
  );
};

export default AuditPage;
