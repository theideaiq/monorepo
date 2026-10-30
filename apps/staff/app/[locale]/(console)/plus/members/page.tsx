import { localized } from "@repo/commerce";
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
import {
  EmptyState,
  MaybeLink,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { SectionTabs } from "@/components/admin/section-tabs";
import { StatCard } from "@/components/admin/stat-card";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { inviteToPlus } from "../actions";
import { plusTabs } from "../tabs";
import { AreaForm, PlusSettingsForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.rentals.plus");
  return { title: t("title") };
};

/**
 * The IDEA Plus launch: places and members, the waitlist (first come,
 * first served), the areas of Baghdad with their delivery days, and the
 * settings.
 */
const PlusLaunchPage = async () => {
  const { canWrite, staff, supabase } = await requireSection("rentals");
  const locale = await getLocale();
  const t = await getTranslations("admin.rentals");
  const tGov = await getTranslations("admin.rentals.plus");
  const format = formatters(locale);

  const [
    { data: status },
    { data: waitlist },
    { data: areas },
    { data: settings },
    { data: subscribers },
  ] = await Promise.all([
    supabase.rpc("plus_status").maybeSingle(),
    supabase
      .from("plus_waitlist")
      .select(
        "user_id, plan_id, governorate, status, created_at, invite_expires_at, area:plus_areas (name_ar, name_en)"
      )
      .in("status", ["waiting", "invited", "expired"])
      .order("created_at")
      .limit(200),
    supabase
      .from("plus_areas")
      .select("id, name_ar, name_en, weekday, active")
      .order("position")
      .order("name_en"),
    supabase
      .from("store_settings")
      .select("plus_capacity, plus_invite_hours, extra_swap_fee")
      .maybeSingle(),
    supabase
      .from("subscriptions")
      .select(
        "id, user_id, status, current_period_end, cancel_at_period_end, created_at, plans!subscriptions_plan_id_fkey!inner(name, audience)"
      )
      .eq("plans.audience", "plus")
      .in("status", ["active", "past_due"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const names = await profileNames(supabase, [
    ...(waitlist ?? []).map((row) => row.user_id),
    ...(subscribers ?? []).map((row) => row.user_id),
  ]);
  const members = status ? status.capacity - status.places_free : 0;

  return (
    <>
      <PageHeader title={t("title")} />
      <SectionTabs tabs={plusTabs(t, staff.role)} />
      <PageBody className="max-w-5xl">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={tGov("taken")}
            value={`${format.number(members)} / ${format.number(status?.capacity ?? 0)}`}
          />
          <StatCard
            label={tGov("free")}
            value={format.number(status?.places_free ?? 0)}
          />
          <StatCard
            label={tGov("waiting")}
            value={format.number(status?.waiting ?? 0)}
          />
        </div>

        <Panel title={tGov("members")}>
          {(subscribers ?? []).length === 0 ? (
            <EmptyState title={tGov("membersEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("member")}</TableHead>
                    <TableHead>{tGov("plan")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{tGov("renews")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(subscribers ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <MaybeLink
                          href={row.user_id && `/customers/${row.user_id}`}
                        >
                          {(row.user_id && names.get(row.user_id)) ||
                            t("unnamed")}
                        </MaybeLink>
                      </TableCell>
                      <TableCell>{row.plans.name}</TableCell>
                      <TableCell>
                        <StatusBadge status={row.status}>
                          {tGov(
                            `memberStatus.${row.status === "past_due" ? "pastDue" : "active"}`
                          )}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.cancel_at_period_end
                          ? tGov("endsOn", {
                              date: format.date(row.current_period_end),
                            })
                          : format.date(row.current_period_end)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        <Panel description={tGov("waitlistHint")} title={tGov("waitlist")}>
          {(waitlist ?? []).length === 0 ? (
            <EmptyState title={tGov("waitlistEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("member")}</TableHead>
                    <TableHead>{tGov("where")}</TableHead>
                    <TableHead>{tGov("since")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    {canWrite ? (
                      <TableHead className="text-end">{t("actions")}</TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(waitlist ?? []).map((row) => (
                    <TableRow key={row.user_id}>
                      <TableCell>
                        <MaybeLink href={`/customers/${row.user_id}`}>
                          {names.get(row.user_id) ?? t("unnamed")}
                        </MaybeLink>
                        {row.plan_id ? (
                          <span className="block text-muted-foreground text-xs">
                            {row.plan_id}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {row.area
                          ? localized(row.area, "name", locale)
                          : row.governorate}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(row.created_at)}
                      </TableCell>
                      <TableCell>
                        {row.status === "invited" && row.invite_expires_at
                          ? tGov("invitedUntil", {
                              date: format.dateTime(row.invite_expires_at),
                            })
                          : tGov(
                              `status.${row.status as "waiting" | "expired"}`
                            )}
                      </TableCell>
                      {canWrite ? (
                        <TableCell className="text-end">
                          {row.status === "invited" ? null : (
                            <ActionButton
                              action={inviteToPlus}
                              fields={{ id: row.user_id }}
                            >
                              {tGov("invite")}
                            </ActionButton>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Panel>

        <Panel description={tGov("areasHint")} title={tGov("areas")}>
          <div className="grid gap-3">
            {(areas ?? []).map((area) => (
              <AreaForm area={area} disabled={!canWrite} key={area.id} />
            ))}
            {canWrite ? <AreaForm area={null} disabled={false} /> : null}
          </div>
        </Panel>

        {settings ? (
          <Panel description={tGov("settingsHint")} title={tGov("settings")}>
            <PlusSettingsForm disabled={!canWrite} settings={settings} />
          </Panel>
        ) : null}
      </PageBody>
    </>
  );
};

export default PlusLaunchPage;
