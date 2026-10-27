"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowLeftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  useCancelProcurementRequest,
  useDecideQuote,
  useProcurementRequest,
} from "@/lib/procurement-queries";

type Request = NonNullable<ReturnType<typeof useProcurementRequest>["data"]>;
type Quote = Request["quotes"][number];

const Confirm = ({
  action,
  children,
  description,
  disabled,
  onConfirm,
  title,
}: {
  action: string;
  children: ReactNode;
  description?: string;
  disabled?: boolean;
  onConfirm: () => void;
  title: string;
}) => {
  const t = useTranslations("app.company.request");
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button disabled={disabled} variant="outline">
          {children}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/** A sent quote: owners and admins accept it (with their own PO reference) or decline. */
const QuoteActions = ({
  quote,
  requestId,
}: {
  quote: Quote;
  requestId: string;
}) => {
  const t = useTranslations("app.company.request");
  const id = useId();
  const { active } = useActiveOrganization();
  const decide = useDecideQuote(active.id, requestId);
  const [reference, setReference] = useState("");

  const accept = (event: FormEvent) => {
    event.preventDefault();
    decide.mutate({ accept: true, quoteId: quote.id, reference });
  };

  return (
    <div className="grid gap-3 border-t pt-4">
      <form
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
        onSubmit={accept}
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor={`${id}-reference`}>{t("reference")}</Label>
          <Input
            id={`${id}-reference`}
            maxLength={100}
            onChange={(event) => setReference(event.target.value)}
            placeholder={t("referencePlaceholder")}
            value={reference}
          />
        </div>
        <Button disabled={decide.isPending} type="submit">
          {t("accept")}
        </Button>
        <Confirm
          action={t("decline")}
          disabled={decide.isPending}
          onConfirm={() => decide.mutate({ accept: false, quoteId: quote.id })}
          title={t("declineTitle")}
        >
          {t("decline")}
        </Confirm>
      </form>
      {decide.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("decideError")}
        </p>
      ) : null}
    </div>
  );
};

const QuoteCard = ({
  canAnswer,
  quote,
  requestId,
}: {
  canAnswer: boolean;
  quote: Quote;
  requestId: string;
}) => {
  const t = useTranslations("app.company");
  const locale = useLocale();
  const total = quote.quote_lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_price,
    0
  );
  const order = quote.purchase_orders;
  const invoice = order?.invoices;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {t("request.quote", { number: String(quote.number) })}
          <Badge variant="outline">{t(`status.quote.${quote.status}`)}</Badge>
          <Link
            className="ms-auto font-normal text-muted-foreground text-sm underline"
            href={`/documents/quote/${quote.id}`}
          >
            {t("request.print")}
          </Link>
        </CardTitle>
        {quote.valid_until ? (
          <CardDescription>
            {t("request.validUntil", {
              date: formatDate(quote.valid_until, locale),
            })}
          </CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-4">
        {quote.notes ? (
          <p className="whitespace-pre-line text-sm">{quote.notes}</p>
        ) : null}
        <ul className="divide-y rounded-md border text-sm">
          {quote.quote_lines.map((line) => (
            <li
              className="flex items-start justify-between gap-4 p-3"
              key={line.id}
            >
              <div className="grid gap-0.5">
                <span>{line.description}</span>
                <span className="text-muted-foreground text-xs">
                  {t("request.lineQuantity", {
                    price: formatCurrency(line.unit_price, locale),
                    quantity: formatNumber(line.quantity, locale),
                  })}
                </span>
              </div>
              <span className="tabular-nums">
                {formatCurrency(line.quantity * line.unit_price, locale)}
              </span>
            </li>
          ))}
          <li className="flex justify-between gap-4 p-3 font-semibold">
            <span>{t("request.total")}</span>
            <span className="tabular-nums">
              {formatCurrency(total, locale)}
            </span>
          </li>
        </ul>
        {order ? (
          <div className="grid gap-1 rounded-md bg-surface-sunken p-3 text-sm">
            <span className="flex flex-wrap items-center gap-2 font-medium">
              {t("request.order", { number: String(order.number) })}
              <Badge variant="secondary">
                {t(`status.order.${order.status}`)}
              </Badge>
            </span>
            {order.customer_reference ? (
              <span className="text-muted-foreground">
                {t("request.yourReference", {
                  reference: order.customer_reference,
                })}
              </span>
            ) : null}
            <Link className="underline" href={`/documents/order/${order.id}`}>
              {t("request.printOrder")}
            </Link>
            {invoice ? (
              <Link className="underline" href="/organization/invoices">
                {t("request.invoice", {
                  number: String(invoice.number),
                  status: t(`status.invoice.${invoice.status}`),
                })}
              </Link>
            ) : null}
          </div>
        ) : null}
        {canAnswer && quote.status === "sent" ? (
          <QuoteActions quote={quote} requestId={requestId} />
        ) : null}
      </CardContent>
    </Card>
  );
};

const RequestDetail = ({ requestId }: { requestId: string }) => {
  const t = useTranslations("app.company");
  const locale = useLocale();
  const { active, canManage } = useActiveOrganization();
  const request = useProcurementRequest(requestId);
  const cancel = useCancelProcurementRequest(active.id, requestId);

  if (request.isPending) {
    return <SectionSpinner />;
  }
  if (request.isError) {
    return <ErrorState onRetry={() => request.refetch()} />;
  }
  const { data } = request;
  if (!data || data.organization_id !== active.id) {
    return <p className="text-muted-foreground">{t("request.notFound")}</p>;
  }
  const open = data.status === "submitted" || data.status === "quoted";

  return (
    <div className="flex flex-col gap-6">
      <Link
        className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
        href="/bulk-buying"
      >
        <ArrowLeftIcon className="size-4 rtl:rotate-180" />
        {t("procurement.requests")}
      </Link>
      <div className="grid gap-2">
        <h2 className="flex flex-wrap items-center gap-2 font-semibold text-xl">
          {data.title}
          <Badge variant="outline">{t(`status.request.${data.status}`)}</Badge>
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("procurement.number", { number: String(data.number) })}
          {" · "}
          {formatDate(data.created_at, locale)}
          {data.budget
            ? ` · ${t("request.budget", { budget: formatCurrency(data.budget, locale) })}`
            : ""}
          {data.needed_by
            ? ` · ${t("request.neededBy", { date: formatDate(data.needed_by, locale) })}`
            : ""}
        </p>
        {data.details ? (
          <p className="whitespace-pre-line text-sm">{data.details}</p>
        ) : null}
      </div>
      {data.quotes.length === 0 && open ? (
        <p className="text-muted-foreground text-sm">
          {t("request.awaitingQuote")}
        </p>
      ) : null}
      {data.quotes.map((quote) => (
        <QuoteCard
          canAnswer={canManage}
          key={quote.id}
          quote={quote}
          requestId={requestId}
        />
      ))}
      {open && canManage ? (
        <div>
          <Confirm
            action={t("request.cancel")}
            disabled={cancel.isPending}
            onConfirm={() => cancel.mutate()}
            title={t("request.cancelTitle")}
          >
            {t("request.cancel")}
          </Confirm>
          {cancel.isError ? (
            <p className="mt-2 text-destructive text-sm" role="alert">
              {t("request.cancelError")}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

export const ProcurementRequest = ({ requestId }: { requestId: string }) => (
  <BusinessShell feature="bulk_buying">
    <RequestDetail requestId={requestId} />
  </BusinessShell>
);
