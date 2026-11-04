import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import type { Locale } from "@repo/internationalization";
import { PlusIcon, UploadIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckboxField, NativeSelect } from "@/components/admin/fields";
import { FilterBar } from "@/components/admin/filter-bar";
import {
  EmptyState,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { todayInBaghdad } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams, searchTerm } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import {
  type CrmFilter,
  dueState,
  isFiltered,
  type PartnerStage,
  type Priority,
  parseCrmFilter,
  partnerKinds,
  partnerStages,
  splitRange,
} from "@/lib/admin/partner-crm";
import { crmStaff } from "@/lib/admin/partner-crm-staff";
import { requireSection, type ServerClient } from "@/lib/admin/session";
import { dueTones, priorityTones, stageTones } from "./_components/tones";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.nav");
  return { title: t("partnerCrm") };
};

const COLUMNS =
  "id, name, name_ar, kind, country, stage, priority, owner_id, next_action, next_action_on, partner_touches (happened_at)";

/**
 * The organizations matching the filters, either due (a next action on or
 * before today) or not, with the last touch of each.
 */
const query = (
  supabase: ServerClient,
  filter: CrmFilter,
  owner: string | null,
  today: string,
  due: boolean,
  options: { count: "exact"; head?: boolean }
) => {
  let rows = supabase
    .from("partner_orgs")
    .select(COLUMNS, options)
    .order("happened_at", {
      ascending: false,
      referencedTable: "partner_touches",
    })
    .limit(1, { referencedTable: "partner_touches" });
  rows = due
    ? rows.lte("next_action_on", today)
    : rows.or(`next_action_on.is.null,next_action_on.gt.${today}`);
  if (filter.stage) {
    rows = rows.eq("stage", filter.stage);
  }
  if (filter.kind) {
    rows = rows.eq("kind", filter.kind);
  }
  if (filter.country) {
    rows = rows.eq("country", filter.country);
  }
  if (owner) {
    rows = rows.eq("owner_id", owner);
  }
  if (filter.tag) {
    rows = rows.contains("tags", [filter.tag]);
  }
  const term = searchTerm(filter.q);
  if (term) {
    rows = rows.or(
      `name.ilike.%${term}%,name_ar.ilike.%${term}%,website.ilike.%${term}%`
    );
  }
  return rows;
};

/**
 * The partner CRM: every organization The IDEA works with or approaches,
 * the due ones first (overdue, then today), then by priority.
 */
const PartnerCrmPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { canWrite, staff, supabase } = await requireSection("partnerCrm");
  const params = await searchParams;
  const filter = parseCrmFilter(params);
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.partnerCrm");
  const tNav = await getTranslations("admin.nav");
  const tList = await getTranslations("admin.list");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);
  const today = todayInBaghdad();
  const owner = filter.mine ? staff.userId : filter.owner;

  const ordered = (due: boolean, range: readonly [number, number]) =>
    query(supabase, filter, owner, today, due, { count: "exact" })
      .order("priority")
      .order("next_action_on", { nullsFirst: false })
      .order("name")
      .range(range[0], range[1]);

  const [dueHead, restHead, team] = await Promise.all([
    query(supabase, filter, owner, today, true, { count: "exact", head: true }),
    filter.due
      ? Promise.resolve({ count: 0 })
      : query(supabase, filter, owner, today, false, {
          count: "exact",
          head: true,
        }),
    crmStaff(supabase),
  ]);
  const dueCount = dueHead.count ?? 0;
  const total = dueCount + (restHead.count ?? 0);
  const ranges = splitRange(from, to, dueCount);
  const [dueRows, restRows] = await Promise.all([
    ranges.due ? ordered(true, ranges.due) : null,
    ranges.rest && !filter.due ? ordered(false, ranges.rest) : null,
  ]);
  const orgs = [...(dueRows?.data ?? []), ...(restRows?.data ?? [])];
  const names = new Map(team.map((member) => [member.id, member.name]));
  const filtered = isFiltered(filter);

  return (
    <>
      <PageHeader description={t("description")} title={tNav("partnerCrm")}>
        {canWrite ? (
          <>
            <Button asChild variant="outline">
              <Link href="/partners/crm/import">
                <UploadIcon />
                {t("import.title")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/partners/crm/new">
                <PlusIcon />
                {t("new")}
              </Link>
            </Button>
          </>
        ) : null}
      </PageHeader>
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("searchLabel")}
            className="w-56"
            defaultValue={filter.q}
            name="q"
            placeholder={t("searchLabel")}
            type="search"
          />
          <NativeSelect
            aria-label={t("fields.stage")}
            className="w-auto"
            defaultValue={filter.stage ?? ""}
            name="stage"
            options={[
              { label: t("anyStage"), value: "" },
              ...partnerStages.map((stage) => ({
                label: t(`stages.${stage}`),
                value: stage,
              })),
            ]}
          />
          <NativeSelect
            aria-label={t("fields.kind")}
            className="w-auto"
            defaultValue={filter.kind ?? ""}
            name="kind"
            options={[
              { label: t("anyKind"), value: "" },
              ...partnerKinds.map((kind) => ({
                label: t(`kinds.${kind}`),
                value: kind,
              })),
            ]}
          />
          <Input
            aria-label={t("fields.country")}
            className="w-28"
            defaultValue={filter.country ?? ""}
            dir="ltr"
            maxLength={2}
            name="country"
            placeholder={t("countryPlaceholder")}
          />
          <NativeSelect
            aria-label={t("fields.owner")}
            className="w-auto"
            defaultValue={filter.owner ?? ""}
            name="owner"
            options={[
              { label: t("anyOwner"), value: "" },
              ...team.map((member) => ({
                label: member.name ?? t("unnamedStaff"),
                value: member.id,
              })),
            ]}
          />
          <Input
            aria-label={t("fields.tag")}
            className="w-32"
            defaultValue={filter.tag ?? ""}
            name="tag"
            placeholder={t("fields.tag")}
          />
          <CheckboxField
            className="self-center"
            defaultChecked={filter.mine}
            label={t("mine")}
            name="mine"
            value="1"
          />
          <CheckboxField
            className="self-center"
            defaultChecked={filter.due}
            label={t("dueFilter")}
            name="due"
            value="1"
          />
        </FilterBar>
        <Panel
          description={tList("total", { count: format.number(total) })}
          title={t("listTitle")}
        >
          {orgs.length === 0 ? (
            <EmptyState title={filtered ? tList("noResults") : t("empty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("fields.name")}</TableHead>
                    <TableHead>{t("fields.kind")}</TableHead>
                    <TableHead>{t("fields.country")}</TableHead>
                    <TableHead>{t("fields.stage")}</TableHead>
                    <TableHead>{t("fields.priority")}</TableHead>
                    <TableHead>{t("fields.owner")}</TableHead>
                    <TableHead>{t("fields.nextAction")}</TableHead>
                    <TableHead>{t("columns.lastTouch")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orgs.map((org) => {
                    const stage = org.stage as PartnerStage;
                    const priority = org.priority as Priority;
                    const due = dueState(org.next_action_on, today);
                    const lastTouch = org.partner_touches[0]?.happened_at;
                    return (
                      <TableRow key={org.id}>
                        <TableCell className="min-w-48">
                          <Link
                            className="font-medium hover:underline"
                            href={`/partners/crm/${org.id}`}
                          >
                            {org.name}
                          </Link>
                          {org.name_ar ? (
                            <span
                              className="block text-muted-foreground text-xs"
                              dir="rtl"
                            >
                              {org.name_ar}
                            </span>
                          ) : null}
                        </TableCell>
                        <TableCell>{t(`kinds.${org.kind}`)}</TableCell>
                        <TableCell dir="ltr">{org.country ?? "—"}</TableCell>
                        <TableCell>
                          <StatusBadge tone={stageTones[stage]}>
                            {t(`stages.${stage}`)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge tone={priorityTones[priority]}>
                            {t(`priorities.${priority}`)}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {org.owner_id
                            ? (names.get(org.owner_id) ?? t("unnamedStaff"))
                            : t("noOwner")}
                        </TableCell>
                        <TableCell className="min-w-48">
                          {org.next_action ? (
                            <div className="grid gap-1">
                              <span>{org.next_action}</span>
                              <span className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                                {format.date(org.next_action_on)}
                                {due && due !== "upcoming" ? (
                                  <StatusBadge tone={dueTones[due]}>
                                    {t(`due.${due}`)}
                                  </StatusBadge>
                                ) : null}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              {t("noNextAction")}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {lastTouch ? format.date(lastTouch) : t("never")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>
        <Pagination
          count={total}
          page={page}
          params={params}
          pathname="/partners/crm"
        />
      </PageBody>
    </>
  );
};

export default PartnerCrmPage;
