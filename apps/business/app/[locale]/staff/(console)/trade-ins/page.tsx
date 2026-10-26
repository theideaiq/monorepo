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
import { formatters } from "@/lib/admin/format";
import {
  oneOf,
  pageRange,
  param,
  type SearchParams,
  searchTerm,
} from "@/lib/admin/list";
import { Link } from "@/lib/admin/navigation";
import { profileNames } from "@/lib/admin/profiles";
import { requireSection } from "@/lib/admin/session";
import {
  parseTradeInSearch,
  statusesForView,
  tradeInCategories,
  tradeInStatusTone,
  tradeInViews,
} from "@/lib/admin/trade-ins";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.tradeIns");
  return { title: t("title") };
};

/** The "Sell to us" queue: requests waiting on staff first, oldest first. */
const TradeInsPage = async ({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) => {
  const { supabase } = await requireSection("tradeIns");
  const params = await searchParams;
  const t = await getTranslations("admin.tradeIns");
  const tTrade = await getTranslations("store.tradeIn");
  const format = formatters(await getLocale());
  const { from, page, to } = pageRange(params);

  const view = oneOf(params, "status", tradeInViews) ?? "open";
  const category = oneOf(params, "category", tradeInCategories);
  const q = param(params, "q");
  const search = parseTradeInSearch(q);

  let query = supabase
    .from("trade_ins")
    .select(
      "id, number, user_id, category, title, condition, payout, asking_price, offer_amount, status, photos, created_at",
      { count: "exact" }
    )
    // trade_in_status is declared in workflow order.
    .order("status", { ascending: true })
    .order("created_at", { ascending: true })
    .range(from, to);
  const statuses = statusesForView(view);
  if (statuses) {
    query = query.in("status", statuses);
  }
  if (category) {
    query = query.eq("category", category);
  }
  if (search && "number" in search) {
    query = query.eq("number", search.number);
  } else if (search && searchTerm(search.title)) {
    query = query.ilike("title", `%${searchTerm(search.title)}%`);
  }

  const { count, data } = await query;
  const requests = data ?? [];
  const names = await profileNames(
    supabase,
    requests.map((request) => request.user_id)
  );

  return (
    <>
      <PageHeader
        description={t("count", { count: format.number(count ?? 0) })}
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
            defaultValue={view}
            name="status"
            options={tradeInViews.map((value) => ({
              label:
                value === "open" || value === "waiting" || value === "all"
                  ? t(`views.${value}`)
                  : tTrade(`status.${value}`),
              value,
            }))}
          />
          <NativeSelect
            aria-label={t("category")}
            className="w-auto"
            defaultValue={category ?? ""}
            name="category"
            options={[
              { label: t("anyCategory"), value: "" },
              ...tradeInCategories.map((value) => ({
                label: tTrade(`category.${value}`),
                value,
              })),
            ]}
          />
        </FilterBar>

        {requests.length === 0 ? (
          <EmptyState title={t("empty")} />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("request")}</TableHead>
                  <TableHead>{t("customer")}</TableHead>
                  <TableHead>{t("category")}</TableHead>
                  <TableHead>{t("status")}</TableHead>
                  <TableHead>{t("asking")}</TableHead>
                  <TableHead>{t("offer")}</TableHead>
                  <TableHead>{t("received")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="max-w-80">
                      <Link
                        className="grid gap-0.5 hover:underline"
                        href={`/trade-ins/${request.id}`}
                      >
                        <span className="text-muted-foreground text-xs tabular-nums">
                          {t("number", { number: String(request.number) })}
                          {request.photos.length
                            ? ` · ${t("photoCount", { count: format.number(request.photos.length) })}`
                            : null}
                        </span>
                        <span className="truncate font-medium">
                          {request.title}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {names.get(request.user_id) || t("unnamedCustomer")}
                    </TableCell>
                    <TableCell>
                      {tTrade(`category.${request.category}`)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge tone={tradeInStatusTone[request.status]}>
                        {tTrade(`status.${request.status}`)}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {request.asking_price === null
                        ? "—"
                        : format.money(request.asking_price)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {request.offer_amount === null
                        ? "—"
                        : format.money(request.offer_amount)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {format.dateTime(request.created_at)}
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
          pathname="/trade-ins"
        />
      </PageBody>
    </>
  );
};

export default TradeInsPage;
