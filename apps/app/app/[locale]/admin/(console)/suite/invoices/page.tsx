import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import { localePath } from "@repo/internationalization";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { Pagination } from "@/components/admin/pagination";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { pageRange, type SearchParams } from "@/lib/admin/list";
import { requireSection } from "@/lib/admin/session";
import { suiteAbilities } from "../_components/roles";
import { SuiteTabs } from "../_components/suite-tabs";
import { invoiceTone } from "../_components/tones";
import { setInvoiceStatus } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.suite.invoices");
  return { title: t("title") };
};

/** Every company invoice (purchase orders and The IDEA Plus seats), newest first. */
const SuiteInvoicesPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { staff, supabase } = await requireSection("suite");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.suite.invoices");
  const tStatus = await getTranslations("app.suite.status");
  const format = formatters(locale);
  const abilities = suiteAbilities(staff.role);
  const { from, page, to } = pageRange(params);

  const { count, data } = await supabase
    .from("invoices")
    .select(
      "id, number, amount, status, description, due_on, issued_at, organizations (name), purchase_orders (number)",
      { count: "exact" }
    )
    .order("issued_at", { ascending: false })
    .range(from, to);
  const invoices = data ?? [];

  return (
    <>
      <PageHeader title={t("title")} />
      <PageBody>
        <SuiteTabs />
        {invoices.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("invoice")}</TableHead>
                  <TableHead>{t("company")}</TableHead>
                  <TableHead>{t("for")}</TableHead>
                  <TableHead>{t("amount")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("due")}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <a
                        className="font-medium underline"
                        href={localePath(
                          locale,
                          `/documents/invoice/${invoice.id}`
                        )}
                      >
                        {t("number", { number: String(invoice.number) })}
                      </a>
                    </TableCell>
                    <TableCell>{invoice.organizations?.name ?? "—"}</TableCell>
                    <TableCell>
                      {invoice.purchase_orders
                        ? t("order", {
                            number: String(invoice.purchase_orders.number),
                          })
                        : (invoice.description ?? "—")}
                    </TableCell>
                    <TableCell>{format.money(invoice.amount)}</TableCell>
                    <TableCell>
                      <StatusBadge tone={invoiceTone[invoice.status]}>
                        {tStatus(`invoice.${invoice.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{format.date(invoice.due_on)}</TableCell>
                    <TableCell>
                      {invoice.status === "issued" && abilities.invoices ? (
                        <div className="flex justify-end gap-2">
                          <ActionButton
                            action={setInvoiceStatus}
                            fields={{ invoiceId: invoice.id, status: "paid" }}
                            size="sm"
                            variant="default"
                          >
                            {t("markPaid")}
                          </ActionButton>
                          <ActionButton
                            action={setInvoiceStatus}
                            confirm={{ title: t("void") }}
                            fields={{ invoiceId: invoice.id, status: "void" }}
                            size="sm"
                            variant="ghost"
                          >
                            {t("void")}
                          </ActionButton>
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <Pagination
          count={count}
          page={page}
          params={params}
          pathname="/suite/invoices"
        />
      </PageBody>
    </>
  );
};

export default SuiteInvoicesPage;
