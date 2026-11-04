import { localized } from "@repo/commerce";
import type { Tables } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { formatCurrency } from "@repo/internationalization/format";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ExternalLinkIcon,
} from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, Panel } from "@/components/admin/page";
import { RecordHeader } from "@/components/admin/record-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { todayInBaghdad } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import {
  type DealStage,
  dueState,
  type PartnerStage,
  type Priority,
} from "@/lib/admin/partner-crm";
import { crmStaff } from "@/lib/admin/partner-crm-staff";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection, type ServerClient } from "@/lib/admin/session";
import { countryName } from "@/lib/admin/travel";
import { OrgForm } from "../_components/org-form";
import { DealForm, PersonForm, TouchForm } from "../_components/record-forms";
import {
  dealStageTones,
  dueTones,
  priorityTones,
  stageTones,
} from "../_components/tones";
import {
  deletePartnerDeal,
  deletePartnerOrg,
  deletePartnerPerson,
  deletePartnerTouch,
} from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.partnerCrm");
  return { title: t("organization") };
};

type Person = Tables<"partner_people">;
type Touch = Tables<"partner_touches">;
type Deal = Tables<"partner_deals">;

/** The organization's people, each to change or remove, then a new one. */
const People = async ({
  canWrite,
  orgId,
  people,
}: {
  readonly canWrite: boolean;
  readonly orgId: string;
  readonly people: readonly Person[];
}) => {
  const t = await getTranslations("admin.partnerCrm.people");
  const tCommon = await getTranslations("admin.common");

  return (
    <div className="grid gap-4">
      {people.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="grid gap-3">
          {people.map((person) => (
            <li className="grid gap-2 rounded-lg border p-3" key={person.id}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-medium">{person.name}</span>
                {person.role ? (
                  <span className="text-muted-foreground text-sm">
                    {person.role}
                  </span>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {person.email ? (
                  <a
                    className="underline"
                    dir="ltr"
                    href={`mailto:${person.email}`}
                  >
                    {person.email}
                  </a>
                ) : null}
                {person.phone ? (
                  <a
                    className="underline"
                    dir="ltr"
                    href={`tel:${person.phone}`}
                  >
                    {person.phone}
                  </a>
                ) : null}
              </div>
              <p className="text-muted-foreground text-xs">
                {t("sourceLine", { source: person.source ?? t("noSource") })}
              </p>
              {person.notes ? (
                <p className="whitespace-pre-line text-muted-foreground text-sm">
                  {person.notes}
                </p>
              ) : null}
              {canWrite ? (
                <div className="flex flex-wrap items-start gap-2">
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer text-sm underline">
                      {tCommon("edit")}
                    </summary>
                    <div className="pt-3">
                      <PersonForm orgId={orgId} person={person} />
                    </div>
                  </details>
                  <ActionButton
                    action={deletePartnerPerson}
                    confirm={{
                      description: t("removeDescription"),
                      title: t("removeConfirm"),
                    }}
                    fields={{ id: person.id }}
                    variant="ghost"
                  >
                    {t("remove")}
                  </ActionButton>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
      {canWrite ? (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium text-sm">
            {t("add")}
          </summary>
          <div className="pt-3">
            <PersonForm orgId={orgId} />
          </div>
        </details>
      ) : null}
    </div>
  );
};

/** Every touch, newest first: which way, how, when, with whom and by whom. */
const Timeline = async ({
  isAdmin,
  people,
  staffNames,
  touches,
  userId,
}: {
  readonly isAdmin: boolean;
  readonly people: ReadonlyMap<string, string>;
  readonly staffNames: ReadonlyMap<string, string | null>;
  readonly touches: readonly Touch[];
  readonly userId: string;
}) => {
  const t = await getTranslations("admin.partnerCrm.activity");
  const tCommon = await getTranslations("admin.common");
  const locale = (await getLocale()) as Locale;
  const format = formatters(locale);

  if (touches.length === 0) {
    return <EmptyState title={t("empty")} />;
  }
  return (
    <ol className="grid gap-3 border-s ps-4">
      {touches.map((touch) => {
        const Direction = touch.inbound ? ArrowDownLeftIcon : ArrowUpRightIcon;
        const person = touch.person_id ? people.get(touch.person_id) : null;
        const by = touch.staff_id
          ? (staffNames.get(touch.staff_id) ?? t("unnamedStaff"))
          : t("formerStaff");
        return (
          <li className="grid gap-1" key={touch.id}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <StatusBadge tone={touch.inbound ? "info" : "neutral"}>
                <Direction aria-hidden="true" className="size-3" />
                {t(touch.inbound ? "inbound" : "outbound")}
              </StatusBadge>
              <span className="font-medium">
                {t(`channels.${touch.channel}`)}
              </span>
              <span className="text-muted-foreground">
                {format.dateTime(touch.happened_at)}
              </span>
              {person ? (
                <span className="text-muted-foreground">
                  {t("withLine", { name: person })}
                </span>
              ) : null}
              <span className="text-muted-foreground text-xs">
                {t("byLine", { name: by })}
              </span>
            </div>
            <p className="whitespace-pre-line text-sm">{touch.summary}</p>
            {isAdmin || touch.staff_id === userId ? (
              <div>
                <ActionButton
                  action={deletePartnerTouch}
                  confirm={{ title: t("deleteConfirm") }}
                  fields={{ id: touch.id }}
                  variant="ghost"
                >
                  {tCommon("delete")}
                </ActionButton>
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
};

/** The deals with the organization, each to change, then a new one. */
const Deals = async ({
  canWrite,
  deals,
  opportunities,
  orgId,
}: {
  readonly canWrite: boolean;
  readonly deals: readonly Deal[];
  readonly opportunities: readonly { id: string; title: string }[];
  readonly orgId: string;
}) => {
  const t = await getTranslations("admin.partnerCrm.deals");
  const tCommon = await getTranslations("admin.common");
  const locale = (await getLocale()) as Locale;
  const format = formatters(locale);
  const titles = new Map(opportunities.map((item) => [item.id, item.title]));

  return (
    <div className="grid gap-4">
      {deals.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : (
        <ul className="grid gap-3">
          {deals.map((deal) => {
            const stage = deal.stage as DealStage;
            const opportunity = deal.opportunity_id
              ? titles.get(deal.opportunity_id)
              : null;
            return (
              <li className="grid gap-2 rounded-lg border p-3" key={deal.id}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{deal.title}</span>
                  <StatusBadge tone="neutral">
                    {t(`kinds.${deal.kind}`)}
                  </StatusBadge>
                  <StatusBadge tone={dealStageTones[stage]}>
                    {t(`stages.${stage}`)}
                  </StatusBadge>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground text-sm">
                  <span className="tabular-nums">
                    {deal.value_iqd === null
                      ? t("noValue")
                      : formatCurrency(deal.value_iqd, locale)}
                  </span>
                  {deal.expected_on ? (
                    <span>
                      {t("expectedLine", {
                        date: format.date(deal.expected_on),
                      })}
                    </span>
                  ) : null}
                  {deal.opportunity_id ? (
                    <Link
                      className="underline"
                      href={`/club/opportunities/${deal.opportunity_id}`}
                    >
                      {opportunity ?? t("opportunity")}
                    </Link>
                  ) : null}
                </div>
                {deal.notes ? (
                  <p className="whitespace-pre-line text-muted-foreground text-sm">
                    {deal.notes}
                  </p>
                ) : null}
                {canWrite ? (
                  <div className="flex flex-wrap items-start gap-2">
                    <details className="min-w-0 flex-1">
                      <summary className="cursor-pointer text-sm underline">
                        {tCommon("edit")}
                      </summary>
                      <div className="pt-3">
                        <DealForm
                          deal={deal}
                          opportunities={opportunities}
                          orgId={orgId}
                        />
                      </div>
                    </details>
                    <ActionButton
                      action={deletePartnerDeal}
                      confirm={{ title: t("deleteConfirm") }}
                      fields={{ id: deal.id }}
                      variant="ghost"
                    >
                      {tCommon("delete")}
                    </ActionButton>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {canWrite ? (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium text-sm">
            {t("add")}
          </summary>
          <div className="pt-3">
            <DealForm opportunities={opportunities} orgId={orgId} />
          </div>
        </details>
      ) : null}
    </div>
  );
};

type Org = Tables<"partner_orgs">;

/** The opportunities staff can read, and any a deal already links. */
const withLinked = async (
  supabase: ServerClient,
  rows: readonly { id: string; title_ar: string; title_en: string }[],
  deals: readonly Deal[],
  locale: Locale
) => {
  const listed = new Set(rows.map((row) => row.id));
  const missing = deals.flatMap((deal) =>
    deal.opportunity_id && !listed.has(deal.opportunity_id)
      ? [deal.opportunity_id]
      : []
  );
  const { data: linked } =
    missing.length > 0
      ? await supabase
          .from("opportunities")
          .select("id, title_ar, title_en")
          .in("id", missing)
      : { data: [] };
  return [...(linked ?? []), ...rows].map((row) => ({
    id: row.id,
    title: localized(row, "title", locale),
  }));
};

const SCHEME = /^https?:\/\//i;

/** Where it is, its kind and its website, under the name. */
const OrgFacts = async ({ org }: { readonly org: Org }) => {
  const t = await getTranslations("admin.partnerCrm");
  const locale = (await getLocale()) as Locale;
  const place = [
    org.city,
    org.country ? countryName(org.country, locale) : null,
  ]
    .filter(Boolean)
    .join(locale === "ar" ? "، " : ", ");
  return (
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {org.name_ar ? <span dir="rtl">{org.name_ar}</span> : null}
      <span>{t(`kinds.${org.kind}`)}</span>
      {place ? <span>{place}</span> : null}
      {org.website ? (
        <a
          className="inline-flex items-center gap-1 underline"
          dir="ltr"
          href={org.website}
          rel="noopener noreferrer"
          target="_blank"
        >
          {org.website.replace(SCHEME, "")}
          <ExternalLinkIcon aria-hidden="true" className="size-3" />
        </a>
      ) : null}
    </span>
  );
};

/** The next action with its date, marked overdue or today. */
const NextAction = async ({ org }: { readonly org: Org }) => {
  const t = await getTranslations("admin.partnerCrm");
  const format = formatters((await getLocale()) as Locale);
  if (!org.next_action) {
    return t("noNextAction");
  }
  const due = dueState(org.next_action_on, todayInBaghdad());
  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-base">
      {org.next_action}
      {due ? (
        <StatusBadge tone={dueTones[due]}>
          {due === "upcoming"
            ? format.date(org.next_action_on)
            : t(`due.${due}`)}
        </StatusBadge>
      ) : null}
    </span>
  );
};

/**
 * The record header: name, stage and priority, where it is and its
 * website, then the owner, the next action and the counts.
 */
const OrgHeader = async ({
  isAdmin,
  lastTouch,
  openDeals,
  org,
  owner,
  people,
}: {
  readonly isAdmin: boolean;
  readonly lastTouch: string | null;
  readonly openDeals: number;
  readonly org: Org;
  readonly owner: string;
  readonly people: number;
}) => {
  const t = await getTranslations("admin.partnerCrm");
  const tCommon = await getTranslations("admin.common");
  const tNav = await getTranslations("admin.nav");
  const format = formatters((await getLocale()) as Locale);
  const stage = org.stage as PartnerStage;
  const priority = org.priority as Priority;

  return (
    <RecordHeader
      actions={
        isAdmin ? (
          <ActionButton
            action={deletePartnerOrg}
            confirm={{
              description: t("deleteDescription"),
              title: t("deleteConfirm"),
            }}
            fields={{ id: org.id }}
            variant="destructive"
          >
            {tCommon("delete")}
          </ActionButton>
        ) : null
      }
      breadcrumb={[{ href: "/partners/crm", label: tNav("partnerCrm") }]}
      chips={
        <>
          <StatusBadge tone={stageTones[stage]}>
            {t(`stages.${stage}`)}
          </StatusBadge>
          <StatusBadge tone={priorityTones[priority]}>
            {t(`priorities.${priority}`)}
          </StatusBadge>
        </>
      }
      description={<OrgFacts org={org} />}
      numbers={[
        { label: t("fields.owner"), value: owner },
        {
          href: "#organization",
          label: t("fields.nextAction"),
          value: <NextAction org={org} />,
        },
        {
          href: "#people",
          label: t("tabs.people"),
          value: format.number(people),
        },
        {
          href: "#deals",
          label: t("openDeals"),
          value: format.number(openDeals),
        },
        {
          href: "#activity",
          label: t("columns.lastTouch"),
          value: lastTouch ? format.date(lastTouch) : t("never"),
        },
      ]}
      tabs={[
        { href: "#organization", label: t("tabs.organization") },
        { href: "#people", label: t("tabs.people") },
        { href: "#activity", label: t("tabs.activity") },
        { href: "#deals", label: t("tabs.deals") },
      ]}
      title={org.name}
    />
  );
};

/**
 * One partner organization: its header (stage, priority, owner, website,
 * country and next action), its details, then People, Activity and Deals.
 */
const PartnerOrgPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, staff, supabase } = await requireSection("partnerCrm");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.partnerCrm");

  const [
    { data: org },
    { data: people },
    { data: touches },
    { data: deals },
    { data: opportunityRows },
    team,
  ] = await Promise.all([
    supabase.from("partner_orgs").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("partner_people")
      .select("*")
      .eq("org_id", id)
      .order("created_at"),
    supabase
      .from("partner_touches")
      .select("*")
      .eq("org_id", id)
      .order("happened_at", { ascending: false })
      .limit(200),
    supabase
      .from("partner_deals")
      .select("*")
      .eq("org_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("opportunities")
      .select("id, title_ar, title_en")
      .order("created_at", { ascending: false })
      .limit(300),
    crmStaff(supabase),
  ]);
  if (!org) {
    notFound();
  }

  const orgPeople = people ?? [];
  const orgDeals = deals ?? [];
  const opportunities = await withLinked(
    supabase,
    opportunityRows ?? [],
    orgDeals,
    locale
  );

  const isAdmin = staff.role === "admin" || staff.role === "superadmin";
  const owner = org.owner_id
    ? (team.find((member) => member.id === org.owner_id)?.name ??
      t("unnamedStaff"))
    : t("noOwner");
  const staffNames = await profileNames(
    supabase,
    (touches ?? []).map((touch) => touch.staff_id)
  );

  return (
    <>
      <OrgHeader
        isAdmin={isAdmin}
        lastTouch={touches?.[0]?.happened_at ?? null}
        openDeals={
          orgDeals.filter(
            (deal) => deal.stage !== "done" && deal.stage !== "lost"
          ).length
        }
        org={org}
        owner={owner}
        people={orgPeople.length}
      />
      <PageBody className="max-w-6xl">
        <div className="scroll-mt-4" id="organization">
          {canWrite ? (
            <OrgForm org={org} staff={team} />
          ) : (
            <Panel title={t("organization")}>
              <p className="whitespace-pre-line text-sm">{org.notes}</p>
            </Panel>
          )}
        </div>
        <Panel
          description={t("people.description")}
          id="people"
          title={t("tabs.people")}
        >
          <People canWrite={canWrite} orgId={org.id} people={orgPeople} />
        </Panel>
        <Panel
          description={t("activity.description")}
          id="activity"
          title={t("tabs.activity")}
        >
          {canWrite ? (
            <TouchForm
              hasNextAction={Boolean(org.next_action)}
              orgId={org.id}
              people={orgPeople.map((person) => ({
                id: person.id,
                name: person.name,
              }))}
            />
          ) : null}
          <Timeline
            isAdmin={isAdmin}
            people={
              new Map(orgPeople.map((person) => [person.id, person.name]))
            }
            staffNames={staffNames}
            touches={touches ?? []}
            userId={staff.userId}
          />
        </Panel>
        <Panel
          description={t("deals.description")}
          id="deals"
          title={t("tabs.deals")}
        >
          <Deals
            canWrite={canWrite}
            deals={orgDeals}
            opportunities={opportunities}
            orgId={org.id}
          />
        </Panel>
      </PageBody>
    </>
  );
};

export default PartnerOrgPage;
