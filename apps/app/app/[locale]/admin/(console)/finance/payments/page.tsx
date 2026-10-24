import { Constants } from "@repo/database";
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
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { oneOf, pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { FinanceTabs } from "../_components/finance-tabs";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.finance.tabs");
  return { title: t("payments") };
};

const statuses = Constants.public.Enums.payment_status;

/** Payments recorded by the payment provider's webhook (read only). */
const PaymentsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("finance");
  const params = await searchParams;
  const t = await getTranslations("admin.finance.payments");
  const tFinance = await getTranslations("admin.finance");
  const tStatus = await getTranslations("billing.paymentStatus");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);
  const status = oneOf(params, "status", statuses);

  let query = supabase
    .from("payments")
    .select(
      "id, reference_id, description, amount, refunded_amount, status, payment_method, paid_at, created_at, order_id, subscription_id, user_id",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (status) {
    query = query.eq("status", status);
  }
  const { count, data: payments } = await query;
  const names = await profileNames(
    supabase,
    (payments ?? []).map((payment) => payment.user_id)
  );

  return (
    <>
      <PageHeader title={tFinance("title")} />
      <FinanceTabs />
      <PageBody>
        <FilterBar>
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={status ?? ""}
            name="status"
            options={[
              { label: t("anyStatus"), value: "" },
              ...statuses.map((value) => ({ label: tStatus(value), value })),
            ]}
          />
        </FilterBar>
        {(payments ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("for")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">{t("amount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(payments ?? []).map((payment) => {
                  let purpose = t("other");
                  if (payment.order_id) {
                    purpose = t("order");
                  } else if (payment.subscription_id) {
                    purpose = t("subscription");
                  }
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(payment.paid_at ?? payment.created_at)}
                        <span
                          className="block font-mono text-muted-foreground text-xs"
                          dir="ltr"
                        >
                          {payment.reference_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        {payment.order_id ? (
                          <Link
                            className="hover:underline"
                            href={`/orders/${payment.order_id}`}
                          >
                            {purpose}
                          </Link>
                        ) : (
                          purpose
                        )}
                        {payment.description ? (
                          <span className="block text-muted-foreground text-xs">
                            {payment.description}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {payment.user_id
                          ? (names.get(payment.user_id) ?? "—")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={payment.status}>
                          {tStatus(payment.status)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(payment.amount)}
                        {payment.refunded_amount > 0 ? (
                          <span className="block text-muted-foreground text-xs">
                            {t("refunded", {
                              amount: format.money(payment.refunded_amount),
                            })}
                          </span>
                        ) : null}
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
          pathname="/finance/payments"
        />
      </PageBody>
    </>
  );
};

export default PaymentsPage;
