"use client";

import { useAuth } from "@repo/auth/provider";
import { project } from "@repo/config";
import type { Enums } from "@repo/database";
import { BrandLogo } from "@repo/design-system/components/brand-logo";
import { Button } from "@repo/design-system/components/ui/button";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { PrinterIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ErrorState, FullPageSpinner } from "@/components/states";
import type { DocumentKind } from "@/lib/documents";
import { unwrap } from "@/lib/queries";

interface Line {
  description: string;
  id: string;
  quantity: number;
  unitPrice: number;
}

/** A fact under the title, as a message key and its values. */
type Fact =
  | { date: string; key: "due" | "paidOn" | "validUntil" }
  | { key: "order"; number: number }
  | { key: "reference"; reference: string };

interface PrintableDocument {
  company: string;
  date: string;
  facts: Fact[];
  lines: Line[];
  notes: string | null;
  number: number;
  status:
    | `invoice.${Enums<"invoice_status">}`
    | `order.${Enums<"purchase_order_status">}`
    | `quote.${Enums<"quote_status">}`;
  subject: string | null;
}

type Supabase = ReturnType<typeof useAuth>["supabase"];

type Lines = {
  description: string;
  id: string;
  position: number;
  quantity: number;
  unit_price: number;
}[];

const toLines = (lines: Lines | null | undefined): Line[] =>
  [...(lines ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((line) => ({
      description: line.description,
      id: line.id,
      quantity: line.quantity,
      unitPrice: line.unit_price,
    }));

const loadQuote = async (
  supabase: Supabase,
  id: string
): Promise<PrintableDocument | null> => {
  const quote = unwrap(
    await supabase
      .from("quotes")
      .select(
        "number, status, notes, valid_until, sent_at, created_at, quote_lines (*), procurement_requests (title, organizations (name))"
      )
      .eq("id", id)
      .maybeSingle()
  );
  if (!quote) {
    return null;
  }
  const request = quote.procurement_requests;
  return {
    company: request?.organizations?.name ?? "",
    date: quote.sent_at ?? quote.created_at,
    facts: quote.valid_until
      ? [{ date: quote.valid_until, key: "validUntil" }]
      : [],
    lines: toLines(quote.quote_lines),
    notes: quote.notes,
    number: quote.number,
    status: `quote.${quote.status}`,
    subject: request?.title ?? null,
  };
};

const loadOrder = async (
  supabase: Supabase,
  id: string
): Promise<PrintableDocument | null> => {
  const order = unwrap(
    await supabase
      .from("purchase_orders")
      .select(
        "number, status, customer_reference, created_at, organizations (name), quotes (quote_lines (*), procurement_requests (title))"
      )
      .eq("id", id)
      .maybeSingle()
  );
  if (!order) {
    return null;
  }
  return {
    company: order.organizations?.name ?? "",
    date: order.created_at,
    facts: order.customer_reference
      ? [{ key: "reference", reference: order.customer_reference }]
      : [],
    lines: toLines(order.quotes?.quote_lines),
    notes: null,
    number: order.number,
    status: `order.${order.status}`,
    subject: order.quotes?.procurement_requests?.title ?? null,
  };
};

const loadInvoice = async (
  supabase: Supabase,
  id: string
): Promise<PrintableDocument | null> => {
  const invoice = unwrap(
    await supabase
      .from("invoices")
      .select(
        "id, number, status, amount, description, due_on, issued_at, paid_at, organizations (name), purchase_orders (number, customer_reference, quotes (quote_lines (*), procurement_requests (title)))"
      )
      .eq("id", id)
      .maybeSingle()
  );
  if (!invoice) {
    return null;
  }
  const order = invoice.purchase_orders;
  const facts: Fact[] = [
    invoice.status === "paid" && invoice.paid_at
      ? { date: invoice.paid_at, key: "paidOn" }
      : { date: invoice.due_on, key: "due" },
  ];
  if (order) {
    facts.push({ key: "order", number: order.number });
  }
  if (order?.customer_reference) {
    facts.push({ key: "reference", reference: order.customer_reference });
  }
  return {
    company: invoice.organizations?.name ?? "",
    date: invoice.issued_at,
    facts,
    lines: order
      ? toLines(order.quotes?.quote_lines)
      : [
          {
            description: invoice.description ?? "",
            id: invoice.id,
            quantity: 1,
            unitPrice: invoice.amount,
          },
        ],
    notes: null,
    number: invoice.number,
    status: `invoice.${invoice.status}`,
    subject: order?.quotes?.procurement_requests?.title ?? null,
  };
};

const loaders = { invoice: loadInvoice, order: loadOrder, quote: loadQuote };

/** Loads one document through RLS: the company's members and staff. */
const useDocument = (kind: DocumentKind, id: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => loaders[kind](supabase, id),
    queryKey: ["company-document", kind, id] as const,
  });
};

/**
 * A quote, purchase order or invoice laid out for paper: the browser's
 * print dialog prints it or saves it as a PDF (in Arabic or English).
 */
export const DocumentView = ({
  id,
  kind,
}: {
  readonly id: string;
  readonly kind: DocumentKind;
}) => {
  const t = useTranslations("app.company.document");
  const tStatus = useTranslations("app.company.status");
  const locale = useLocale();
  const factText = (fact: Fact) => {
    switch (fact.key) {
      case "order":
        return t("order", { number: String(fact.number) });
      case "reference":
        return t("reference", { reference: fact.reference });
      default:
        return t(fact.key, { date: formatDate(fact.date, locale) });
    }
  };
  const doc = useDocument(kind, id);

  if (doc.isPending) {
    return <FullPageSpinner />;
  }
  if (doc.isError) {
    return <ErrorState onRetry={() => doc.refetch()} />;
  }
  const { data } = doc;
  if (!data) {
    return (
      <p className="p-8 text-center text-muted-foreground">{t("notFound")}</p>
    );
  }
  const total = data.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitPrice,
    0
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 bg-background p-6 text-foreground md:p-10 print:max-w-none print:p-0">
      <div className="flex justify-end print:hidden">
        <Button onClick={() => window.print()}>
          <PrinterIcon />
          {t("print")}
        </Button>
      </div>
      <header className="flex flex-wrap items-start justify-between gap-6 border-b pb-6">
        <div className="grid gap-2">
          <BrandLogo />
          <p className="text-muted-foreground text-sm" dir="ltr">
            {project.supportEmail}
          </p>
        </div>
        <div className="grid gap-1 text-end">
          <h1 className="font-bold text-2xl">
            {t(`kinds.${kind}`, { number: String(data.number) })}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(data.date, locale)} · {tStatus(data.status)}
          </p>
          {data.facts.map((fact) => (
            <p className="text-muted-foreground text-sm" key={fact.key}>
              {factText(fact)}
            </p>
          ))}
        </div>
      </header>

      <section className="grid gap-1">
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {t("billTo")}
        </p>
        <p className="font-semibold">{data.company}</p>
        {data.subject ? (
          <p className="text-muted-foreground text-sm">{data.subject}</p>
        ) : null}
      </section>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="py-2 text-start font-medium">{t("item")}</th>
            <th className="py-2 text-end font-medium">{t("quantity")}</th>
            <th className="py-2 text-end font-medium">{t("unitPrice")}</th>
            <th className="py-2 text-end font-medium">{t("amount")}</th>
          </tr>
        </thead>
        <tbody>
          {data.lines.map((line) => (
            <tr className="border-b" key={line.id}>
              <td className="py-2">{line.description}</td>
              <td className="py-2 text-end tabular-nums">
                {formatNumber(line.quantity, locale)}
              </td>
              <td className="py-2 text-end tabular-nums">
                {formatCurrency(line.unitPrice, locale)}
              </td>
              <td className="py-2 text-end tabular-nums">
                {formatCurrency(line.quantity * line.unitPrice, locale)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="pt-4 font-semibold" colSpan={3}>
              {t("total")}
            </td>
            <td className="pt-4 text-end font-semibold tabular-nums">
              {formatCurrency(total, locale)}
            </td>
          </tr>
        </tfoot>
      </table>

      {data.notes ? (
        <p className="whitespace-pre-line text-sm">{data.notes}</p>
      ) : null}
      <footer className="border-t pt-6 text-muted-foreground text-xs">
        {t("footer")}
      </footer>
    </div>
  );
};
