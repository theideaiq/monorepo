import { Button } from "@repo/design-system/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { Link } from "@repo/internationalization/navigation";
import { PlusIcon } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/page";
import { StatusBadge } from "@/components/status-badge";
import { formatters } from "@/lib/format";
import { requireSection } from "@/lib/session";
import { CatalogTabs } from "../_components/catalog-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.catalog.tabs");
  return { title: t("plans") };
};

const PlansPage = async () => {
  const { canWrite, supabase } = await requireSection("catalog");
  const t = await getTranslations("admin.catalog");
  const format = formatters(await getLocale());
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("audience")
    .order("position");

  return (
    <>
      <PageHeader title={t("title")}>
        {canWrite ? (
          <Button asChild>
            <Link href="/catalog/plans/new">
              <PlusIcon />
              {t("plans.new")}
            </Link>
          </Button>
        ) : null}
      </PageHeader>
      <CatalogTabs />
      <PageBody>
        {(plans ?? []).length === 0 ? (
          <EmptyState title={t("plans.empty")} />
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("plans.name")}</TableHead>
                  <TableHead>{t("plans.audience")}</TableHead>
                  <TableHead className="text-end">{t("plans.amount")}</TableHead>
                  <TableHead>{t("plans.interval")}</TableHead>
                  <TableHead className="text-end">{t("plans.slots")}</TableHead>
                  <TableHead>{t("fields.status")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(plans ?? []).map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell>
                      <Link
                        className="font-medium hover:underline"
                        href={`/catalog/plans/${plan.id}`}
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
