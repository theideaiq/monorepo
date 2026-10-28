import { formatPrice } from "@repo/commerce";
import { getReturnPhotoUrl } from "@repo/storage";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { EmptyState, PageBody, PageHeader } from "@/components/admin/page";
import { formatters } from "@/lib/admin/format";
import { Link } from "@/lib/admin/navigation";
import { requireSection } from "@/lib/admin/session";
import { DecideReturnForm, RefundedForm } from "./forms";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders.returns");
  return { title: t("title") };
};

const LIMIT = 100;
const RETURN_COLUMNS =
  "id, number, status, reason, details, photos, quantity, unopened, fault, shop_note, condition_note, received_at, disputed_at, refund_amount, refund_bulbs, collection_fee, seller_id, item:order_items!inner (name_ar, name_en, seller_name, unit_price), order:orders!inner (id, number, payment_method, paid_at)" as const;

/**
 * Orders → Returns: disputes to decide within 48 hours (the shop's
 * reason, or what it found wrong with the item), and refunds due, sent
 * the way the customer paid (Wayl for online orders, ZainCash, Qi or bank
 * transfer for cash) and marked here with the reference.
 */
const ReturnsPage = async () => {
  const { canWrite, supabase } = await requireSection("orders");
  const locale = await getLocale();
  const t = await getTranslations("admin.orders.returns");
  const reasons = await getTranslations("app.orders.returns.reasons");
  const format = formatters(locale);

  const [{ data: disputed }, { data: due }] = await Promise.all([
    supabase
      .from("returns")
      .select(RETURN_COLUMNS)
      .eq("status", "disputed")
      .order("disputed_at")
      .limit(LIMIT),
    supabase
      .from("returns")
      .select(RETURN_COLUMNS)
      .eq("status", "refund_due")
      .order("refund_due_at")
      .limit(LIMIT),
  ]);

  const photoUrls = new Map(
    await Promise.all(
      (disputed ?? [])
        .flatMap((item) => item.photos)
        .map(
          async (path) =>
            [
              path,
              await getReturnPhotoUrl(supabase, path).catch(() => null),
            ] as const
        )
    )
  );

  type Row = NonNullable<typeof disputed>[number];
  const heading = (item: Row) => (
    <div className="grid gap-1 text-sm">
      <p className="font-medium">
        {t("line", {
          name: locale === "ar" ? item.item.name_ar : item.item.name_en,
          number: String(item.number),
          quantity: String(item.quantity),
          shop: item.item.seller_name ?? t("house"),
        })}
      </p>
      <p className="text-muted-foreground">
        <Link className="hover:underline" href={`/orders/${item.order.id}`}>
          #{item.order.number}
        </Link>
        {" · "}
        {reasons(item.reason)}
        {item.unopened ? ` · ${t("unopened")}` : ""}
        {" · "}
        {formatPrice(item.item.unit_price * item.quantity, locale)}
      </p>
    </div>
  );

  return (
    <>
      <PageHeader description={t("description")} title={t("title")} />
      <PageBody>
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("disputedTitle")}</h2>
          {(disputed ?? []).length === 0 ? (
            <EmptyState title={t("disputedEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(disputed ?? []).map((item) => (
                <li className="grid gap-3 rounded-lg border p-4" key={item.id}>
                  {heading(item)}
                  {item.details ? (
                    <p className="text-sm">
                      {t("customerSays", { text: item.details })}
                    </p>
                  ) : null}
                  {item.received_at ? (
                    <p className="text-sm">
                      {t("shopFound", { text: item.condition_note ?? "" })}
                    </p>
                  ) : (
                    <p className="text-sm">
                      {t("shopSays", { text: item.shop_note ?? "" })}
                    </p>
                  )}
                  {item.photos.length > 0 ? (
                    <ul className="flex flex-wrap gap-2">
                      {item.photos.map((path, index) => {
                        const url = photoUrls.get(path);
                        return url ? (
                          <li key={path}>
                            <a
                              className="text-pink-text text-sm hover:underline"
                              href={url}
                              rel="noopener noreferrer"
                              target="_blank"
                            >
                              {t("photo", { number: String(index + 1) })}
                            </a>
                          </li>
                        ) : null;
                      })}
                    </ul>
                  ) : null}
                  {item.disputed_at ? (
                    <p className="text-muted-foreground text-xs">
                      {t("disputedOn", {
                        time: format.dateTime(item.disputed_at),
                      })}
                    </p>
                  ) : null}
                  {canWrite ? (
                    <DecideReturnForm fault={item.fault} id={item.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-3" id="refunds">
          <h2 className="font-semibold text-lg">{t("dueTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("dueDescription")}</p>
          {(due ?? []).length === 0 ? (
            <EmptyState title={t("dueEmpty")} />
          ) : (
            <ul className="grid gap-3">
              {(due ?? []).map((item) => (
                <li className="grid gap-3 rounded-lg border p-4" key={item.id}>
                  {heading(item)}
                  <p className="text-sm">
                    {t("refund", {
                      amount: formatPrice(item.refund_amount ?? 0, locale),
                      bulbs: String(item.refund_bulbs ?? 0),
                    })}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {t(
                      item.order.payment_method === "online"
                        ? "viaWayl"
                        : "viaTransfer"
                    )}
                  </p>
                  {canWrite ? <RefundedForm id={item.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PageBody>
    </>
  );
};

export default ReturnsPage;
