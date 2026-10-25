import type { Tables } from "@repo/database";
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
import { ActionButton } from "@/components/admin/action-button";
import {
  DetailList,
  PageBody,
  PageHeader,
  Panel,
} from "@/components/admin/page";
import { StatusBadge } from "@/components/admin/status-badge";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import { OrderPanel } from "../_components/order-panel";
import { NewQuoteForm, QuoteLineForm } from "../_components/quote-forms";
import { suiteAbilities } from "../_components/roles";
import { quoteTone, requestTone } from "../_components/tones";
import {
  cancelRequest,
  deleteQuote,
  removeQuoteLine,
  sendQuote,
} from "../actions";

type Quote = Tables<"quotes"> & { quote_lines: Tables<"quote_lines">[] };

const QuotePanel = async ({
  canEdit,
  quote,
}: {
  readonly canEdit: boolean;
  readonly quote: Quote;
}) => {
  const t = await getTranslations("admin.suite.quotes");
  const tStatus = await getTranslations("app.suite.status");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(await getLocale());
  const draft = quote.status === "draft" && canEdit;
  const lines = [...quote.quote_lines].sort(
    (a, b) =>
      a.position - b.position || a.created_at.localeCompare(b.created_at)
  );
  const total = lines.reduce(
    (sum, line) => sum + line.quantity * line.unit_price,
    0
  );

  return (
    <Panel
      actions={
        <StatusBadge tone={quoteTone[quote.status]}>
          {tStatus(`quote.${quote.status}`)}
        </StatusBadge>
      }
      description={[
        quote.notes,
        quote.valid_until
          ? t("validUntilDate", { date: format.date(quote.valid_until) })
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      title={t("number", { number: String(quote.number) })}
    >
      {lines.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("description")}</TableHead>
              <TableHead>{t("quantity")}</TableHead>
              <TableHead>{t("unitPrice")}</TableHead>
              <TableHead>{t("lineTotal")}</TableHead>
              {draft ? <TableHead /> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>{line.description}</TableCell>
                <TableCell className="tabular-nums">
                  {format.number(line.quantity)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {format.money(line.unit_price)}
                </TableCell>
                <TableCell className="tabular-nums">
                  {format.money(line.quantity * line.unit_price)}
                </TableCell>
                {draft ? (
                  <TableCell className="text-end">
                    <ActionButton
                      action={removeQuoteLine}
                      fields={{ lineId: line.id }}
                      variant="ghost"
                    >
                      {tCommon("delete")}
                    </ActionButton>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-muted-foreground text-sm">{t("noLines")}</p>
      )}
      <p className="font-medium text-sm">
        {t("total", { total: format.money(total) })}
      </p>
      {draft ? (
        <>
          <QuoteLineForm quoteId={quote.id} />
          <div className="flex flex-wrap gap-2">
            <ActionButton
              action={sendQuote}
              confirm={{ description: t("sendDescription"), title: t("send") }}
              fields={{ quoteId: quote.id }}
              variant="default"
            >
              {t("send")}
            </ActionButton>
            <ActionButton
              action={deleteQuote}
              confirm={{ title: tCommon("deleteConfirm") }}
              fields={{ quoteId: quote.id }}
              variant="ghost"
            >
              {tCommon("delete")}
            </ActionButton>
          </div>
        </>
      ) : null}
    </Panel>
  );
};

/** A company's procurement request: its quotes, order and invoice. */
const SuiteRequestPage = async ({
  params,
}: {
  readonly params: Promise<{ id: string }>;
}) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { staff, supabase } = await requireSection("suite");
  const can = suiteAbilities(staff.role);
  const t = await getTranslations("admin.suite");
  const tStatus = await getTranslations("app.suite.status");
  const format = formatters(await getLocale());

  const { data: request } = await supabase
    .from("procurement_requests")
    .select("*, organizations (name), quotes (*, quote_lines (*))")
    .eq("id", id)
    .maybeSingle();
  if (!request) {
    notFound();
  }
  const quotes = [...request.quotes].sort((a, b) => a.number - b.number);
  const accepted = quotes.find((quote) => quote.status === "accepted");
  const [{ data: order }, names] = await Promise.all([
    accepted
      ? supabase
          .from("purchase_orders")
          .select("*, invoices (*)")
          .eq("quote_id", accepted.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    profileNames(supabase, request.created_by ? [request.created_by] : []),
  ]);
  const open = request.status === "submitted" || request.status === "quoted";

  return (
    <>
      <PageHeader
        back={{ href: "/suite", label: t("title") }}
        description={request.organizations?.name}
        title={`${t("number", { number: String(request.number) })} · ${request.title}`}
      >
        {open && can.quotes ? (
          <ActionButton
            action={cancelRequest}
            confirm={{ title: t("cancelRequest") }}
            fields={{ requestId: request.id }}
            variant="outline"
          >
            {t("cancelRequest")}
          </ActionButton>
        ) : null}
      </PageHeader>
      <PageBody className="xl:grid-cols-[1fr_22rem]">
        <div className="grid content-start gap-4">
          {quotes.map((quote) => (
            <QuotePanel canEdit={can.quotes} key={quote.id} quote={quote} />
          ))}
          {open && can.quotes ? (
            <Panel title={t("quotes.new")}>
              <NewQuoteForm requestId={request.id} />
            </Panel>
          ) : null}
          {order ? <OrderPanel abilities={can} order={order} /> : null}
        </div>
        <Panel title={t("details")}>
          <DetailList
            items={[
              {
                label: t("status"),
                value: (
                  <StatusBadge tone={requestTone[request.status]}>
                    {tStatus(`request.${request.status}`)}
                  </StatusBadge>
                ),
              },
              {
                label: t("requestedBy"),
                value: request.created_by
                  ? (names.get(request.created_by) ?? "—")
                  : "—",
              },
              { label: t("budget"), value: format.money(request.budget) },
              { label: t("neededBy"), value: format.date(request.needed_by) },
              {
                label: t("received"),
                value: format.dateTime(request.created_at),
              },
            ]}
          />
          {request.details ? (
            <p className="whitespace-pre-line text-sm">{request.details}</p>
          ) : null}
        </Panel>
      </PageBody>
    </>
  );
};

export default SuiteRequestPage;
