import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { Link } from "@/lib/admin/navigation";
import type { ServerClient } from "@/lib/admin/session";
import { countryName, type RouteStatus } from "@/lib/admin/travel";
import { unlinkTravelRoute } from "../actions";
import { Requirements } from "./requirements";
import { RouteLinkForm } from "./route-link-form";

/**
 * An opportunity's travel: the Travel Kit routes its travellers take, and
 * its own extra requirements (the same lines as a route's).
 */
export const OpportunityTravel = async ({
  canWrite,
  opportunityId,
  supabase,
}: {
  readonly canWrite: boolean;
  readonly opportunityId: string;
  readonly supabase: ServerClient;
}) => {
  const t = await getTranslations("admin.editorial.travel");
  const locale = (await getLocale()) as Locale;

  const [{ data: links }, { data: routes }, { data: extras }] =
    await Promise.all([
      supabase
        .from("opportunity_travel_routes")
        .select("route_id")
        .eq("opportunity_id", opportunityId),
      supabase
        .from("travel_routes")
        .select("id, country, visa_ar, visa_en, status")
        .order("country")
        .order("slug")
        .limit(500),
      supabase
        .from("travel_requirements")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("position")
        .order("created_at"),
    ]);
  const linkedIds = new Set((links ?? []).map((link) => link.route_id));
  const label = (route: NonNullable<typeof routes>[number]) =>
    `${countryName(route.country, locale)} · ${localized(route, "visa", locale)}`;
  const linked = (routes ?? []).filter((route) => linkedIds.has(route.id));
  const available = (routes ?? []).filter((route) => !linkedIds.has(route.id));

  return (
    <Panel
      description={t("sectionDescription")}
      id="travel"
      title={t("section")}
    >
      <div className="grid gap-3">
        <h3 className="font-medium text-sm">{t("routes")}</h3>
        {linked.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("routesEmpty")}</p>
        ) : (
          <ul className="grid gap-2">
            {linked.map((route) => {
              const status = route.status as RouteStatus;
              return (
                <li
                  className="flex flex-wrap items-center gap-2 text-sm"
                  key={route.id}
                >
                  <Link
                    className="font-medium hover:underline"
                    href={`/club/travel/${route.id}`}
                  >
                    {label(route)}
                  </Link>
                  <StatusBadge status={status}>
                    {t(`statuses.${status}`)}
                  </StatusBadge>
                  {canWrite ? (
                    <ActionButton
                      action={unlinkTravelRoute}
                      confirm={{ title: t("unlinkConfirm") }}
                      fields={{ opportunityId, routeId: route.id }}
                      variant="ghost"
                    >
                      {t("unlink")}
                    </ActionButton>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        {canWrite && available.length > 0 ? (
          <RouteLinkForm
            opportunityId={opportunityId}
            routes={available.map((route) => ({
              label: `${label(route)} (${t(`statuses.${route.status as RouteStatus}`)})`,
              value: route.id,
            }))}
          />
        ) : null}
        {canWrite && available.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noRoutesToLink")}</p>
        ) : null}
      </div>
      <div className="grid gap-3">
        <h3 className="font-medium text-sm">{t("extras")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("extrasDescription")}
        </p>
        <Requirements
          canWrite={canWrite}
          parent={{ opportunityId }}
          requirements={extras ?? []}
        />
      </div>
    </Panel>
  );
};
