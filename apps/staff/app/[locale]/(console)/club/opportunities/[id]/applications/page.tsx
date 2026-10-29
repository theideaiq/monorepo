import { localized } from "@repo/commerce";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { type ApplicationStatus, guardianNote } from "./status";

/**
 * A program's applications: waiting for a decision first (oldest first),
 * then the rest, with what each has paid.
 */
const ApplicationsPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("editorial");
  const locale = await getLocale();
  const t = await getTranslations("admin.editorial.programs");
  const format = formatters(locale);

  const [{ data: listing }, { data: applications }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id, title_ar, title_en")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("program_applications")
      .select(
        "id, user_id, status, guardian_status, price, created_at, payments:program_payments (amount, paid_at)"
      )
      .eq("program_id", id)
      .order("created_at")
      .limit(500),
  ]);
  if (!listing) {
    notFound();
  }
  const waiting = new Set(["submitted", "waitlisted"]);
  const rows = [...(applications ?? [])].sort(
    (a, b) => Number(waiting.has(b.status)) - Number(waiting.has(a.status))
  );
  const names = await profileNames(
    supabase,
    rows.map((row) => row.user_id)
  );

  return (
    <>
      <PageHeader
        back={{
          href: `/club/opportunities/${id}`,
          label: localized(listing, "title", locale),
        }}
        title={t("applications")}
      />
      <PageBody>
        {rows.length === 0 ? (
          <EmptyState title={t("noApplications")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("applicant")}</TableHead>
                  <TableHead>{t("applied")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("paid")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const status = row.status as ApplicationStatus;
                  const paid = (row.payments ?? [])
                    .filter((payment) => payment.paid_at)
                    .reduce((sum, payment) => sum + payment.amount, 0);
                  const guardian = guardianNote(row.guardian_status);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/club/opportunities/${id}/applications/${row.id}`}
                        >
                          {names.get(row.user_id) ?? t("unnamed")}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.date(row.created_at)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status}>
                          {t(`statuses.${status}`)}
                        </StatusBadge>
                        {guardian ? (
                          <span className="ms-2 text-muted-foreground text-xs">
                            {t(`guardian.${guardian}`)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {row.price === null
                          ? "—"
                          : t("paidOf", {
                              paid: format.money(paid),
                              price: format.money(row.price),
                            })}
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

export default ApplicationsPage;
