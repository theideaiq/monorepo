"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { formatCurrency, formatDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useInvoices } from "@/lib/procurement-queries";

/** The company's invoices for its purchase orders. */
const InvoiceList = () => {
  const t = useTranslations("app.company");
  const locale = useLocale();
  const { active } = useActiveOrganization();
  const invoices = useInvoices(active.id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">{t("invoices.description")}</p>
      {invoices.isPending ? <SectionSpinner /> : null}
      {invoices.isError ? (
        <ErrorState onRetry={() => invoices.refetch()} />
      ) : null}
      {invoices.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("invoices.empty")}</p>
      ) : null}
      {invoices.data?.length ? (
        <ul className="divide-y rounded-md border">
          {invoices.data.map((invoice) => {
            const order = invoice.purchase_orders;
            return (
              <li
                className="flex flex-wrap items-center justify-between gap-4 p-3 text-sm"
                key={invoice.id}
              >
                <div className="grid gap-0.5">
                  <Link
                    className="font-medium underline"
                    href={`/documents/invoice/${invoice.id}`}
                  >
                    {t("invoices.number", { number: String(invoice.number) })}
                  </Link>
                  {invoice.description ? (
                    <span className="text-muted-foreground text-xs">
                      {invoice.description}
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs">
                    {invoice.status === "paid" && invoice.paid_at
                      ? t("invoices.paidOn", {
                          date: formatDate(invoice.paid_at, locale),
                        })
                      : t("invoices.due", {
                          date: formatDate(invoice.due_on, locale),
                        })}
                  </span>
                  {order ? (
                    <Link
                      className="text-muted-foreground text-xs underline"
                      href={`/bulk-buying/${order.quotes?.request_id}`}
                    >
                      {order.customer_reference
                        ? t("invoices.orderWithReference", {
                            number: String(order.number),
                            reference: order.customer_reference,
                          })
                        : t("invoices.order", { number: String(order.number) })}
                    </Link>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="tabular-nums">
                    {formatCurrency(invoice.amount, locale)}
                  </span>
                  <Badge
                    variant={
                      invoice.status === "issued" ? "default" : "outline"
                    }
                  >
                    {t(`status.invoice.${invoice.status}`)}
                  </Badge>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      <p className="text-muted-foreground text-xs">{t("invoices.howToPay")}</p>
    </div>
  );
};

export const Invoices = () => (
  <BusinessShell organization>
    <InvoiceList />
  </BusinessShell>
);
