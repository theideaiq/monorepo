import type { Tables } from "@repo/database";
import { getLocale, getTranslations } from "next-intl/server";
import { ActionButton } from "@/components/admin/action-button";
import { DetailList, Panel } from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { issueInvoice, setInvoiceStatus, setOrderStatus } from "../actions";
import type { companyAbilities } from "./roles";
import { invoiceTone, orderTone } from "./tones";

type Order = Tables<"purchase_orders"> & {
  invoices: Tables<"invoices"> | null;
};

/** A purchase order with its delivery and invoice steps. */
export const OrderPanel = async ({
  abilities,
  order,
}: {
  readonly abilities: ReturnType<typeof companyAbilities>;
  readonly order: Order;
}) => {
  const t = await getTranslations("admin.companies.orders");
  const tStatus = await getTranslations("app.company.status");
  const format = formatters(await getLocale());
  const invoice = order.invoices;

  return (
    <Panel
      actions={
        <StatusBadge tone={orderTone[order.status]}>
          {tStatus(`order.${order.status}`)}
        </StatusBadge>
      }
      title={t("number", { number: String(order.number) })}
    >
      <DetailList
        items={[
          { label: t("total"), value: format.money(order.total) },
          {
            label: t("reference"),
            value: order.customer_reference ?? "—",
          },
          { label: t("created"), value: format.dateTime(order.created_at) },
          {
            label: t("invoice"),
            value: invoice ? (
              <span className="flex flex-wrap items-center gap-2">
                {t("invoiceNumber", { number: String(invoice.number) })}
                <StatusBadge tone={invoiceTone[invoice.status]}>
                  {tStatus(`invoice.${invoice.status}`)}
                </StatusBadge>
                {t("due", { date: format.date(invoice.due_on) })}
              </span>
            ) : (
              "—"
            ),
          },
        ]}
      />
      <div className="flex flex-wrap gap-2">
        {order.status === "open" && abilities.quotes ? (
          <>
            <ActionButton
              action={setOrderStatus}
              fields={{ orderId: order.id, status: "delivered" }}
              variant="default"
            >
              {t("markDelivered")}
            </ActionButton>
            <ActionButton
              action={setOrderStatus}
              confirm={{ title: t("cancel") }}
              fields={{ orderId: order.id, status: "cancelled" }}
              variant="ghost"
            >
              {t("cancel")}
            </ActionButton>
          </>
        ) : null}
        {!invoice && order.status !== "cancelled" && abilities.invoices ? (
          <ActionButton
            action={issueInvoice}
            fields={{ days: "30", orderId: order.id }}
            variant="secondary"
          >
            {t("issueInvoice")}
          </ActionButton>
        ) : null}
        {invoice?.status === "issued" && abilities.invoices ? (
          <>
            <ActionButton
              action={setInvoiceStatus}
              fields={{ invoiceId: invoice.id, status: "paid" }}
              variant="default"
            >
              {t("markPaid")}
            </ActionButton>
            <ActionButton
              action={setInvoiceStatus}
              confirm={{ title: t("voidInvoice") }}
              fields={{ invoiceId: invoice.id, status: "void" }}
              variant="ghost"
            >
              {t("voidInvoice")}
            </ActionButton>
          </>
        ) : null}
      </div>
    </Panel>
  );
};
