import { formatPrice, HOUSE_SELLER_ID } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatDate } from "@repo/internationalization/format";
import { getTranslations } from "next-intl/server";
import type { PricePoint } from "@/lib/data";

interface PriceHistoryProps {
  readonly history: readonly PricePoint[];
  readonly locale: Locale;
  /** Shop names by seller id (The IDEA's own is named in the messages). */
  readonly sellers: Readonly<Record<string, string>>;
}

/**
 * Every price this product's listings had in the last 90 days, from price
 * history (written only by the database), so "was" and "lowest in 30 days"
 * can be checked. Folded away under the details; nothing when there's none.
 */
export const PriceHistory = async ({
  history,
  locale,
  sellers,
}: PriceHistoryProps) => {
  if (history.length === 0) {
    return null;
  }
  const [t, conditions] = await Promise.all([
    getTranslations({ locale, namespace: "web.store.product.history" }),
    getTranslations({ locale, namespace: "store.condition" }),
  ]);
  const seller = (id: string) =>
    id === HOUSE_SELLER_ID ? t("theIdea") : (sellers[id] ?? t("aShop"));

  return (
    <details className="group rounded-md border">
      <summary className="flex min-h-11 cursor-pointer items-center px-3 font-semibold">
        {t("title")}
      </summary>
      <div className="grid gap-3 border-t p-3 text-sm">
        <p className="text-muted-foreground">{t("description")}</p>
        <table className="w-full text-start">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="py-1 text-start font-medium" scope="col">
                {t("from")}
              </th>
              <th className="py-1 text-start font-medium" scope="col">
                {t("listing")}
              </th>
              <th className="py-1 text-end font-medium" scope="col">
                {t("price")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {history.map((point) => (
              <tr
                key={`${point.seller_id}-${point.condition}-${point.started_at}`}
              >
                <td className="py-2">
                  {point.ended_at
                    ? t("between", {
                        from: formatDate(point.started_at, locale),
                        to: formatDate(point.ended_at, locale),
                      })
                    : t("since", {
                        from: formatDate(point.started_at, locale),
                      })}
                </td>
                <td className="py-2">
                  {seller(point.seller_id)} ·{" "}
                  {conditions(point.condition as "new")}
                </td>
                <td className="py-2 text-end font-mono">
                  {formatPrice(point.price, locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};
