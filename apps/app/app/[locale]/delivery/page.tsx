import { formatPrice, localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/page-hero";
import { EmptyState, Section } from "@/components/section";
import { getDeliveryZones } from "@/lib/data";
import { staticPageMetadata } from "@/lib/metadata";

export const revalidate = 300;

interface DeliveryProps {
  params: Promise<{ locale: Locale }>;
}

export const generateMetadata = staticPageMetadata("delivery", "/delivery");

/**
 * Where we deliver: every zone Staff has switched on (Settings → Store),
 * with its fee, the order total it's free from and how many days it takes,
 * the same numbers checkout uses.
 */
const DeliveryPage = async ({ params }: DeliveryProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, zones] = await Promise.all([
    getTranslations({ locale, namespace: "web.delivery" }),
    getDeliveryZones(),
  ]);

  return (
    <>
      <PageHero
        highlight={t("highlight")}
        subtitle={t("subtitle")}
        title={t("title")}
      />
      <Section>
        {zones.length === 0 ? (
          <EmptyState action={{ href: "/help#contact", label: t("ask") }}>
            {t("empty")}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <caption className="sr-only">{t("caption")}</caption>
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="p-3 text-start font-medium" scope="col">
                    {t("zone")}
                  </th>
                  <th className="p-3 text-start font-medium" scope="col">
                    {t("fee")}
                  </th>
                  <th className="p-3 text-start font-medium" scope="col">
                    {t("days")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <th className="p-3 text-start font-medium" scope="row">
                      {localized(zone, "name", locale)}
                    </th>
                    <td className="p-3">
                      <span className="font-mono">
                        {zone.fee === 0
                          ? t("free")
                          : formatPrice(zone.fee, locale)}
                      </span>
                      {zone.free_from !== null && zone.fee > 0 ? (
                        <span className="block text-muted-foreground text-xs">
                          {t("freeFrom", {
                            total: formatPrice(zone.free_from, locale),
                          })}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      {zone.min_days === zone.max_days
                        ? t("daysOne", {
                            count: zone.max_days,
                            n: formatNumber(zone.max_days, locale),
                          })
                        : t("daysRange", {
                            max: formatNumber(zone.max_days, locale),
                            min: formatNumber(zone.min_days, locale),
                          })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-muted-foreground text-sm">
          {t("note")}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/legal/delivery"
          >
            {t("policy")}
          </Link>
        </p>
      </Section>
    </>
  );
};

export default DeliveryPage;
