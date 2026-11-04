import { formatPrice } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CalendarCheck, Camera, FileCheck, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import type { CommissionRate } from "@/lib/data";
import { EarningsEstimator } from "./earnings-estimator";

/**
 * Active listings on Free; Pro is unlimited. The database holds the limit
 * (`private.seller_plan_limit`) and enforces it; this is only the copy.
 */
export const FREE_LISTINGS = 100;

const steps = [
  { icon: FileCheck, id: "apply" },
  { icon: Camera, id: "list" },
  { icon: Truck, id: "deliver" },
  { icon: CalendarCheck, id: "paid" },
] as const;

/**
 * `/partners` leads with selling: how it works, the commission by category
 * as finance sets it, Free and Pro with Pro's price, and what a sale pays,
 * each from the database, with the selling policy behind it.
 */
export const Selling = async ({
  locale,
  pro,
  rates,
  startHref,
}: {
  readonly locale: Locale;
  readonly pro: { monthly: number; yearly: number } | null;
  readonly rates: readonly CommissionRate[];
  /** Where a shop starts: Partners' organization setup. */
  readonly startHref: string;
}) => {
  const t = await getTranslations({
    locale,
    namespace: "web.partners.selling",
  });
  const percent = (value: number) =>
    `${formatNumber(Math.round(value * 1000) / 10, locale)}%`;

  return (
    <>
      <Section title={t("how.title")}>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, id }) => (
            <li
              className="grid content-start gap-2 rounded-lg border bg-card p-5"
              key={id}
            >
              <Icon aria-hidden="true" className="size-5 text-pink-text" />
              <span className="font-medium">{t(`how.${id}.title`)}</span>
              <span className="text-muted-foreground text-sm">
                {t(`how.${id}.description`)}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-muted-foreground text-sm">
          {t("how.policy")}{" "}
          <Link
            className="font-medium text-pink-text hover:underline"
            href="/legal/selling"
          >
            {t("how.policyLink")}
          </Link>
        </p>
      </Section>

      <Section title={t("plans.title")}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid content-start gap-2 rounded-[28px] border bg-card p-6">
            <h3 className="font-bold text-pink-text text-xl">
              {t("plans.free.name")}
            </h3>
            <p className="font-bold font-mono text-2xl">
              {t("plans.free.price")}
            </p>
            <ul className="grid gap-1 text-sm">
              <li>
                {t("plans.free.listings", {
                  n: formatNumber(FREE_LISTINGS, locale),
                })}
              </li>
              <li>{t("plans.free.commission")}</li>
            </ul>
          </div>
          <div className="grid content-start gap-2 rounded-[28px] border-2 border-idea-pink bg-card p-6">
            <h3 className="font-bold text-pink-text text-xl">
              {t("plans.pro.name")}
            </h3>
            {pro ? (
              <p>
                <span className="font-bold font-mono text-2xl">
                  {formatPrice(pro.monthly, locale)}
                </span>{" "}
                <span className="text-muted-foreground text-sm">
                  {t("plans.pro.perMonth", {
                    year: formatPrice(pro.yearly, locale),
                  })}
                </span>
              </p>
            ) : null}
            <ul className="grid gap-1 text-sm">
              <li>{t("plans.pro.listings")}</li>
              <li>{t("plans.pro.commission")}</li>
              <li>{t("plans.pro.billing")}</li>
            </ul>
          </div>
        </div>
      </Section>

      {rates.length > 0 ? (
        <Section title={t("commission.title")}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <caption className="sr-only">{t("commission.title")}</caption>
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="p-3 text-start font-medium" scope="col">
                      {t("commission.category")}
                    </th>
                    <th className="p-3 text-end font-medium" scope="col">
                      {t("plans.free.name")}
                    </th>
                    <th className="p-3 text-end font-medium" scope="col">
                      {t("plans.pro.name")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rates.map((rate) => (
                    <tr key={rate.slug}>
                      <th className="p-3 text-start font-normal" scope="row">
                        {locale === "en" ? rate.name_en : rate.name_ar}
                      </th>
                      <td className="p-3 text-end font-mono">
                        {percent(rate.standard)}
                      </td>
                      <td className="p-3 text-end font-mono">
                        {percent(rate.pro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <EarningsEstimator rates={rates} />
          </div>
          <p className="mt-4">
            <a
              className="inline-flex min-h-11 items-center font-medium text-pink-text hover:underline"
              href={startHref}
            >
              {t("start")}
            </a>
          </p>
        </Section>
      ) : null}
    </>
  );
};
