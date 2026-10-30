import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { SectionTabs } from "@/components/admin/section-tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { plusTabs } from "../tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("plans") };
};

const PlansPage = async () => {
  const { canWrite, staff, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const tPlus = await getTranslations("admin.rentals");
  const format = formatters(await getLocale());
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("audience")
    .order("position");

  return (
    <>
      <PageHeader title={tPlus("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/plus/plans/new">
              <PlusIcon />
              {t("plans.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <SectionTabs tabs={plusTabs(tPlus, staff.role)} />
      <PageBody>
        {(plans ?? []).length === 0 ? (
          <EmptyState title={t("plans.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("plans.name")}</TableHead>
                  <TableHead>{t("plans.audience")}</TableHead>
                  <TableHead className="text-end">
                    {t("plans.amount")}
                  </TableHead>
                  <TableHead>{t("plans.interval")}</TableHead>
                  <TableHead className="text-end">{t("plans.slots")}</TableHead>
                  <TableHead className="text-end">{t("plans.tier")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plans ?? []).map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/plus/plans/${plan.id}`}
                      >
                        {plan.name}
                      </Link>
                      <span
                        className="block text-muted-foreground text-xs"
                        dir="ltr"
                      >
                        {plan.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      {t(
                        `plans.audiences.${plan.audience === "plus" ? "plus" : "business"}`
                      )}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.money(plan.amount)}
                    </TableCell>
                    <TableCell>
                      {t(`plans.intervals.${plan.billing_interval}`)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(plan.rental_slots)}
                    </TableCell>
                    <TableCell className="text-end tabular-nums">
                      {format.number(plan.tier)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={plan.active ? "active" : "archived"}>
                        {plan.active ? t("plans.active") : t("plans.inactive")}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageBody>
    </>
  );
};

export default PlansPage;
