import { localized, variantName } from "@repo/commerce";
import { project } from "@repo/config";
import {
  getDirection,
  type Locale,
  localePath,
} from "@repo/internationalization";
import { routing } from "@repo/internationalization/routing";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { env } from "@/env";
import { parseAddress } from "@/lib/admin/address";
import { formatters } from "@/lib/admin/format";
import { isUuid } from "@/lib/admin/list";
import { qrPath } from "@/lib/admin/qr";
import { requireSection } from "@/lib/admin/session";
import { PrintButton } from "./print-button";

interface SlipPageProps {
  readonly params: Promise<{ id: string }>;
}

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("admin.orders.slip");
  return { title: t("title") };
};

/**
 * A11: the packing slip that goes in the parcel. The order number, who it's
 * for, the physical items (no prices, so it suits gifts too), the gift
 * message, and a QR code: the buyer's order page on the website (help and
 * returns start there), or Help for a gift, whose recipient didn't place
 * the order. Printed from the order page; staff only, like the order.
 */
const SlipPage = async ({ params }: SlipPageProps) => {
  const { id } = await params;
  if (!isUuid(id)) {
    notFound();
  }
  const { supabase } = await requireSection("orders");
  const staffLocale = await getLocale();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase
      .from("orders")
      .select("id, number, created_at, is_gift, shipping_address, user_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("order_items")
      .select(
        "id, name_ar, name_en, attributes, quantity, condition, variant:product_variants (label_ar, label_en)"
      )
      .eq("order_id", id)
      // What's in the parcel: no digital codes, no deposit lines.
      .is("digital_product_id", null)
      .neq("kind", "deposit"),
  ]);
  if (!order) {
    notFound();
  }
  const gift = order.is_gift
    ? (
        await supabase
          .from("gifts")
          .select("message")
          .eq("order_id", order.id)
          .maybeSingle()
      ).data
    : null;

  // In the buyer's language when their Pass has one, else Staff's.
  const buyer = order.user_id
    ? (
        await supabase
          .from("profiles")
          .select("locale")
          .eq("id", order.user_id)
          .maybeSingle()
      ).data
    : null;
  const locale: Locale =
    buyer?.locale && hasLocale(routing.locales, buyer.locale)
      ? buyer.locale
      : (staffLocale as Locale);
  const [t, tStore] = await Promise.all([
    getTranslations({ locale, namespace: "admin.orders.slip" }),
    getTranslations({ locale, namespace: "store" }),
  ]);
  const format = formatters(locale);

  const address = parseAddress(order.shipping_address);
  const web = new URL(env.NEXT_PUBLIC_WEB_URL).origin;
  const target = order.is_gift
    ? `${web}${localePath(locale, "/help")}`
    : `${web}${localePath(locale, `/pass/orders/${order.id}`)}`;
  const qr = qrPath(target);

  return (
    <main
      className="mx-auto grid max-w-2xl gap-6 bg-white p-8 text-black print:max-w-none print:p-0"
      dir={getDirection(locale)}
      lang={locale}
    >
      <div className="flex justify-end">
        <PrintButton />
      </div>
      <header className="flex items-start justify-between gap-6 border-b pb-4">
        <div className="grid gap-1">
          <p className="font-bold text-2xl">{project.name}</p>
          <p className="text-sm">{t("heading")}</p>
        </div>
        <div className="grid gap-1 text-end text-sm">
          <p className="font-semibold text-lg">
            {t("number", { number: String(order.number) })}
          </p>
          <p>{format.date(order.created_at)}</p>
        </div>
      </header>
      <p className="text-lg">
        {t("for", { name: address.fullName || t("someone") })}
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-start">
            <th className="py-2 text-start font-semibold">{t("item")}</th>
            <th className="py-2 text-end font-semibold">{t("quantity")}</th>
          </tr>
        </thead>
        <tbody>
          {(items ?? []).map((item) => {
            const variant = variantName(
              { ...item.variant, attributes: item.attributes },
              locale
            );
            return (
              <tr className="border-b align-top" key={item.id}>
                <td className="py-2">
                  {localized(item, "name", locale)}
                  {variant ? (
                    <span className="block text-xs">{variant}</span>
                  ) : null}
                  {item.condition && item.condition !== "new" ? (
                    <span className="block text-xs">
                      {tStore(`condition.${item.condition}`)}
                    </span>
                  ) : null}
                </td>
                <td className="py-2 text-end tabular-nums">
                  {format.number(item.quantity)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {gift?.message ? (
        <section className="grid gap-1 rounded-lg border p-4">
          <p className="font-semibold text-sm">{t("giftMessage")}</p>
          <p className="whitespace-pre-line">{gift.message}</p>
        </section>
      ) : null}
      <footer className="flex items-center gap-4 border-t pt-4">
        <svg
          aria-label={t("qrLabel")}
          className="size-28 shrink-0"
          role="img"
          shapeRendering="crispEdges"
          viewBox={`0 0 ${qr.size} ${qr.size}`}
        >
          <rect fill="#ffffff" height={qr.size} width={qr.size} />
          <path d={qr.path} fill="#16131a" />
        </svg>
        <div className="grid gap-1 text-sm">
          <p className="font-semibold">
            {t(order.is_gift ? "scanGift" : "scan")}
          </p>
          <p className="break-all text-xs" dir="ltr">
            {target}
          </p>
        </div>
      </footer>
    </main>
  );
};

export default SlipPage;
