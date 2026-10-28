import { Input } from "@repo/design-system/components/ui/input";
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
import { governorateName, parseAddress } from "@/lib/admin/address";
import { fromBaghdadInput } from "@/lib/admin/dates";
import { formatters } from "@/lib/admin/format";
import { awaitingFulfilment, orderStatuses } from "@/lib/admin/fulfilment";
import {
  isUuid,
  oneOf,
  pageRange,
  param,
  type SearchParams,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders");
  return { title: t("title") };
};

const NUMBER = /^#?(\d{1,12})$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const OrdersPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("orders");
  const params = await searchParams;
  const locale = await getLocale();
  const t = await getTranslations("admin.orders");
  const tStore = await getTranslations("store");
  const format = formatters(locale);
  const { from, page, to } = pageRange(params);

  const status = oneOf(params, "status", [
    "awaiting",
    ...orderStatuses,
  ] as const);
  const q = param(params, "q");
  const customer = param(params, "customer");
  const since = param(params, "from");
  const until = param(params, "to");

  let query = supabase
    .from("orders")
    .select(
      "id, number, status, total, shipping_address, created_at, paid_at, user_id, fulfilment, payment_method",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status === "awaiting") {
    query = query.in("status", awaitingFulfilment);
  } else if (status) {
    query = query.eq("status", status);
  }
  const number = NUMBER.exec(q)?.[1];
  if (number) {
    query = query.eq("number", Number(number));
  } else if (q) {
    // Name or phone on the delivery address.
    const term = q
      .replace(/[\\%_,()"]/g, " ")
      .trim()
      .slice(0, 60);
    if (term) {
      query = query.or(
        `shipping_address->>full_name.ilike.%${term}%,shipping_address->>phone.ilike.%${term}%`
      );
    }
  }
  if (isUuid(customer)) {
    query = query.eq("user_id", customer);
  }
  if (DATE.test(since)) {
    query = query.gte(
      "created_at",
      fromBaghdadInput(`${since}T00:00`) ?? since
    );
  }
  if (DATE.test(until)) {
    query = query.lte(
      "created_at",
      fromBaghdadInput(`${until}T23:59:59`) ?? until
    );
  }

  const { count, data: orders } = await query;

  return (
    <>
      <PageHeader
        description={t("total", { count: format.number(count ?? 0) })}
        title={t("title")}
      />
      <PageBody>
        <FilterBar>
          <Input
            aria-label={t("search")}
            className="w-56"
            defaultValue={q}
            name="q"
            placeholder={t("search")}
            type="search"
          />
          <NativeSelect
            aria-label={t("status")}
            className="w-auto"
            defaultValue={status ?? ""}
            name="status"
            options={[
              { label: t("anyStatus"), value: "" },
              { label: t("awaiting"), value: "awaiting" },
              ...orderStatuses.map((value) => ({
                label: tStore(`orderStatus.${value}`),
                value,
              })),
            ]}
          />
          <Input
            aria-label={t("from")}
            className="w-auto"
            defaultValue={DATE.test(since) ? since : ""}
            name="from"
            type="date"
          />
          <Input
            aria-label={t("to")}
            className="w-auto"
            defaultValue={DATE.test(until) ? until : ""}
            name="to"
            type="date"
          />
          {isUuid(customer) ? (
            <input name="customer" type="hidden" value={customer} />
          ) : null}
        </FilterBar>

        {(orders ?? []).length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("number")}</TableHead>
                  <TableHead>{t("date")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("governorate")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead className="text-end">{t("totalAmount")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((order) => {
                  const address = parseAddress(order.shipping_address);
                  return (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          className="font-medium tabular-nums hover:underline"
                          dir="ltr"
                          href={`/orders/${order.id}`}
                        >
                          #{order.number}
                        </Link>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format.dateTime(order.created_at)}
                      </TableCell>
                      <TableCell>
                        <span className="block">{address.fullName || "—"}</span>
                        <span
                          className="block text-muted-foreground text-xs"
                          dir="ltr"
                        >
                          {address.phone}
                        </span>
                      </TableCell>
                      <TableCell>
                        {governorateName(address.governorate, locale)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={order.status}>
                          {tStore(`orderStatus.${order.status}`)}
                        </StatusBadge>
                        {order.payment_method === "cash_on_delivery" ||
                        order.fulfilment === "pickup" ? (
                          <span className="block pt-1 text-muted-foreground text-xs">
                            {tStore(`fulfilment.${order.fulfilment}`)} ·{" "}
                            {tStore(`paymentMethod.${order.payment_method}`)}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-end tabular-nums">
                        {format.money(order.total)}
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
          pathname="/orders"
        />
      </PageBody>
    </>
  );
};

export default OrdersPage;
