import { formatPrice } from "@repo/commerce";
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
import { ActionButton } from "@/components/admin/action-button";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { markLineRefunded } from "../actions";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders.shopLines");
  return { title: t("title") };
};

const LIMIT = 200;
const LINE_COLUMNS =
  "id, name_ar, name_en, quantity, unit_price, ready_by, seller_status, seller_name, order:orders!inner (id, number, paid_at, payment_method)" as const;

/**
 * Orders → Shop lines: shops' lines still waiting after their ready-by
 * time (to chase the shop), and paid lines a shop cancelled as out of
 * stock, waiting for their refund.
 */
const ShopLinesPage = async () => {
  const { canWrite, supabase } = await requireSection("orders");
  const locale = await getLocale();
  const t = await getTranslations("admin.orders.shopLines");
  const tCommon = await getTranslations("admin.common");
  const format = formatters(locale);

  const [{ data: late }, { data: refunds }] = await Promise.all([
    supabase
      .from("order_items")
      .select(LINE_COLUMNS)
      .eq("seller_status", "waiting")
      .lt("ready_by", new Date().toISOString())
      .order("ready_by")
      .limit(LIMIT),
    supabase
      .from("order_items")
      .select(LINE_COLUMNS)
      .in("seller_status", ["out_of_stock", "cancelled"])
      .is("refunded_at", null)
      .not("order.paid_at", "is", null)
      .order("created_at")
      .limit(LIMIT),
  ]);

  const name = (line: { name_ar: string; name_en: string }) =>
    locale === "ar" ? line.name_ar : line.name_en;

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("lateTitle")}</h2>
          {(late ?? []).length === 0 ? (
            <EmptyState title={t("lateEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("order")}</TableHead>
                    <TableHead>{t("shop")}</TableHead>
                    <TableHead>{t("item")}</TableHead>
                    <TableHead>{t("due")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(late ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/orders/${line.order.id}`}
                        >
                          #{line.order.number}
                        </Link>
                      </TableCell>
                      <TableCell>{line.seller_name}</TableCell>
                      <TableCell className="whitespace-normal">
                        {name(line)} ×{line.quantity}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {line.ready_by ? format.dateTime(line.ready_by) : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        <section className="grid gap-3" id="refunds">
          <h2 className="font-semibold text-lg">{t("refundsTitle")}</h2>
          <p className="text-muted-foreground text-sm">
            {t("refundsDescription")}
          </p>
          {(refunds ?? []).length === 0 ? (
            <EmptyState title={t("refundsEmpty")} />
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("order")}</TableHead>
                    <TableHead>{t("shop")}</TableHead>
                    <TableHead>{t("item")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    {canWrite ? (
                      <TableHead className="text-end">
                        {tCommon("actions")}
                      </TableHead>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(refunds ?? []).map((line) => (
                    <TableRow key={line.id}>
                      <TableCell>
                        <Link
                          className="font-medium hover:underline"
                          href={`/orders/${line.order.id}`}
                        >
                          #{line.order.number}
                        </Link>
                      </TableCell>
                      <TableCell>{line.seller_name}</TableCell>
                      <TableCell className="whitespace-normal">
                        {name(line)} ×{line.quantity}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatPrice(line.unit_price * line.quantity, locale)}
                      </TableCell>
                      {canWrite ? (
                        <TableCell>
                          <span className="flex justify-end">
                            <ActionButton
                              action={markLineRefunded}
                              fields={{ id: line.id }}
                            >
                              {t("markRefunded")}
                            </ActionButton>
                          </span>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default ShopLinesPage;
