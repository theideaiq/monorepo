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
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { CompaniesTabs } from "../_components/companies-tabs";
import { invoiceTone, orderTone } from "../_components/tones";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.companies.orders");
  return { title: t("title") };
};

/** Purchase orders, newest first, with their invoices. */
const CompanyOrdersPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("companies");
  const params = await searchParams;
  const t = await getTranslations("admin.companies");
  const tStatus = await getTranslations("app.company.status");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);

  const { count, data } = await supabase
    .from("purchase_orders")
    .select(
      "id, number, total, status, created_at, customer_reference, organizations (name), quotes (request_id), invoices (number, status, due_on)",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  const orders = data ?? [];

  return (
    <>
      <PageHeader title={t("orders.title")} />
      <PageBody>
        <CompaniesTabs />
        {orders.length === 0 ? (
          <EmptyState title={t("orders.empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("orders.order")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("orders.total")}</TableHead>
                  <TableHead>{t("orders.invoice")}</TableHead>
                  <TableHead>{t("orders.created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const invoice = order.invoices;
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/companies/${order.quotes?.request_id ?? ""}`}
                        >
                          {t("orders.number", { number: String(order.number) })}
                        </Link>
                        {order.customer_reference ? (
                          <span className="block text-muted-foreground text-xs">
                            {order.customer_reference}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell>{order.organizations?.name ?? "—"}</TableCell>
                      <TableCell>
                        <StatusBadge tone={orderTone[order.status]}>
                          {tStatus(`order.${order.status}`)}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {format.money(order.total)}
                      </TableCell>
                      <TableCell>
                        {invoice ? (
                          <StatusBadge tone={invoiceTone[invoice.status]}>
                            {t("orders.invoiceNumber", {
                              number: String(invoice.number),
                            })}{" "}
                            · {tStatus(`invoice.${invoice.status}`)}
                          </StatusBadge>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            {t("orders.notInvoiced")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(order.created_at)}
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
          pathname="/companies/orders"
        />
      </PageBody>
    </>
  );
};

export default CompanyOrdersPage;
