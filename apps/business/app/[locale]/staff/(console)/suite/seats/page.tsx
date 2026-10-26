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
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { suiteAbilities } from "../_components/roles";
import { SuiteTabs } from "../_components/suite-tabs";
import { seatTone } from "../_components/tones";
import { activateSeat, declineSeat, endSeat } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.suite.seats");
  return { title: t("title") };
};

/**
 * The IDEA Plus seats companies pay for: requests first (finance approves
 * or declines), then active and past seats.
 */
const SuiteSeatsPage = async () => {
  const { staff, supabase } = await requireSection("suite");
  const t = await getTranslations("admin.suite.seats");
  const tStatus = await getTranslations("app.suite.plus.status");
  const format = formatters(await getLocale());
  const abilities = suiteAbilities(staff.role);

  const { data } = await supabase
    .from("plus_seats")
    .select(
      "id, user_id, status, created_at, organizations (name), plans (name, amount), subscriptions (current_period_end)"
    )
    .order("status")
    .order("created_at", { ascending: false })
    .limit(200);
  const seats = data ?? [];
  const names = await profileNames(
    supabase,
    seats.map((seat) => seat.user_id)
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        <SuiteTabs />
        {seats.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("member")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("plan")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("until")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {seats.map((seat) => {
                  const until = seat.subscriptions?.current_period_end;
                  return (
                    <TableRow key={seat.id}>
                      <TableCell>{names.get(seat.user_id) ?? "—"}</TableCell>
                      <TableCell>{seat.organizations?.name ?? "—"}</TableCell>
                      <TableCell>
                        {seat.plans
                          ? `${seat.plans.name} · ${format.money(seat.plans.amount)}`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge tone={seatTone[seat.status]}>
                          {tStatus(seat.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell>{until ? format.date(until) : "—"}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {seat.status === "requested" && abilities.invoices ? (
                            <>
                              <ActionButton
                                action={activateSeat}
                                confirm={{
                                  description: t("approveDescription"),
                                  title: t("approve"),
                                }}
                                fields={{ seatId: seat.id }}
                                size="sm"
                                variant="default"
                              >
                                {t("approve")}
                              </ActionButton>
                              <ActionButton
                                action={declineSeat}
                                fields={{ seatId: seat.id }}
                                size="sm"
                                variant="ghost"
                              >
                                {t("decline")}
                              </ActionButton>
                            </>
                          ) : null}
                          {seat.status === "active" && abilities.invoices ? (
                            <ActionButton
                              action={endSeat}
                              confirm={{ title: t("end") }}
                              fields={{ seatId: seat.id }}
                              size="sm"
                              variant="ghost"
                            >
                              {t("end")}
                            </ActionButton>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default SuiteSeatsPage;
