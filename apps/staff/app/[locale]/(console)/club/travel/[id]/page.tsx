import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { PageBody, Panel } from "@/components/admin/page";
import { RecordHeader } from "@/components/admin/record-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { countryName, type RouteStatus } from "@/lib/admin/travel";
import { Requirements } from "../_components/requirements";
import { RouteForm } from "../_components/route-form";
import { deleteTravelRoute } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.editorial.travel");
  return { title: t("route") };
};

/**
 * One Travel Kit route: its details and status, then its requirements in
 * order, and the programs that link it.
 */
const TravelRoutePage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { canWrite, supabase } = await requireSection("editorial");
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations("admin.editorial");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(locale);

  const [{ data: route }, { data: requirements }, { data: links }] =
    await Promise.all([
      supabase.from("travel_routes").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("travel_requirements")
        .select("*")
        .eq("route_id", id)
        .order("position")
        .order("created_at"),
      supabase
        .from("opportunity_travel_routes")
        .select("opportunity:opportunities (id, title_ar, title_en)")
        .eq("route_id", id)
        .limit(200),
    ]);
  if (!route) {
    notFound();
  }
  const status = route.status as RouteStatus;
  const lines = requirements ?? [];
  const unconfirmed = lines.filter(
    (line) => line.confidence === "unconfirmed"
  ).length;
  const programs = (links ?? []).flatMap((link) =>
    link.opportunity ? [link.opportunity] : []
  );
  const country = countryName(route.country, locale);

  return (
    <>
      <RecordHeader
        actions={
          canWrite ? (
            <ActionButton
              action={deleteTravelRoute}
              confirm={{
                description: t("travel.deleteDescription"),
                title: tCommon("deleteConfirm"),
              }}
              fields={{ id: route.id }}
              variant="destructive"
            >
              {tCommon("delete")}
            </ActionButton>
          ) : null
        }
        breadcrumb={[
          { href: "/club", label: t("title") },
          { href: "/club/travel", label: t("tabs.travel") },
        ]}
        chips={
          <StatusBadge status={status}>
            {t(`travel.statuses.${status}`)}
          </StatusBadge>
        }
        description={<span dir="ltr">{route.slug}</span>}
        numbers={[
          {
            href: "#requirements",
            label: t("travel.requirements"),
            value: format.number(lines.length),
          },
          {
            label: t("travel.unconfirmedCount"),
            value: format.number(unconfirmed),
          },
          {
            label: t("travel.checkedOn"),
            value: route.checked_on
              ? format.date(route.checked_on)
              : t("travel.notChecked"),
          },
          {
            label: t("travel.programs"),
            value: format.number(programs.length),
          },
        ]}
        tabs={[
          { href: "#route", label: t("travel.route") },
          { href: "#requirements", label: t("travel.requirements") },
        ]}
        title={`${country} · ${localized(route, "visa", locale)}`}
      />
      <PageBody className="xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          <div className="scroll-mt-4" id="route">
            <RouteForm route={route} />
          </div>
          <Panel
            description={t("travel.requirementsDescription")}
            id="requirements"
            title={t("travel.requirements")}
          >
            <Requirements
              canWrite={canWrite}
              parent={{ routeId: route.id }}
              requirements={lines}
            />
          </Panel>
        </div>
        <div className="grid content-start gap-4">
          <Panel
            description={t("travel.programsDescription")}
            title={t("travel.programs")}
          >
            {programs.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t("travel.programsEmpty")}
              </p>
            ) : (
              <ul className="grid gap-1 text-sm">
                {programs.map((program) => (
                  <li key={program.id}>
                    <Link
                      className="hover:underline"
                      href={`/club/opportunities/${program.id}#travel`}
                    >
                      {localized(program, "title", locale)}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PageBody>
    </>
  );
};

export default TravelRoutePage;
