import { formatPrice } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import {
  formatCalendarDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ShieldCheckIcon, UsersIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ProgramRow } from "@/lib/data";

interface Installment {
  due_on?: string;
  percent: number;
}

interface RefundStep {
  days_before: number;
  percent: number;
}

const day = (value: string) => new Date(`${value}T12:00:00`);

/**
 * What one of The IDEA's programs is sold as: the price (and Plus price),
 * what's included, insurance and a chaperone, the ages, the installments
 * and the refund schedule, as the programs policy promises.
 */
export const ProgramPackage = async ({
  locale,
  program,
}: {
  readonly locale: Locale;
  readonly program: ProgramRow;
}) => {
  const t = await getTranslations({ locale, namespace: "web.programs" });
  const includes = locale === "ar" ? program.includes_ar : program.includes_en;
  const installments = program.installments as unknown as Installment[];
  const refunds = program.refund_schedule as unknown as RefundStep[];
  const n = (value: number) => formatNumber(value, locale);

  return (
    <section className="grid gap-4 rounded-lg border p-5">
      <div className="grid gap-1">
        <h2 className="font-semibold text-xl">{t("package")}</h2>
        <p className="font-semibold text-2xl">
          {program.price > 0 ? formatPrice(program.price, locale) : t("free")}
        </p>
        {program.plus_price === null ? null : (
          <p className="text-muted-foreground text-sm">
            {t("plusPrice", { price: formatPrice(program.plus_price, locale) })}
          </p>
        )}
      </div>
      {includes ? (
        <div className="grid gap-1">
          <h3 className="font-medium">{t("includes")}</h3>
          <p className="whitespace-pre-line text-muted-foreground text-sm">
            {includes}
          </p>
        </div>
      ) : null}
      <ul className="grid gap-2 text-sm">
        {program.insurance ? (
          <li className="flex gap-2">
            <ShieldCheckIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-pink-text"
            />
            {t("insurance")}
          </li>
        ) : null}
        {program.min_age < 18 && program.chaperone ? (
          <li className="flex gap-2">
            <UsersIcon
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-pink-text"
            />
            {t("chaperone")}
          </li>
        ) : null}
        <li>
          {program.max_age === null
            ? t("agesFrom", { min: n(program.min_age) })
            : t("ages", { max: n(program.max_age), min: n(program.min_age) })}
        </li>
        {program.seats === null ? null : (
          <li>{t("seats", { seats: n(program.seats) })}</li>
        )}
      </ul>
      {program.price > 0 ? (
        <div className="grid gap-1">
          <h3 className="font-medium">{t("installments")}</h3>
          <ul className="grid gap-1 text-muted-foreground text-sm">
            {installments.map((step, index) => (
              <li key={step.due_on ?? "first"}>
                {index === 0
                  ? t("firstInstallment", {
                      days: n(program.pay_within_days),
                      percent: n(step.percent),
                    })
                  : t("laterInstallment", {
                      date: formatCalendarDate(day(step.due_on ?? ""), locale),
                      percent: n(step.percent),
                    })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {program.price > 0 ? (
        <div className="grid gap-1">
          <h3 className="font-medium">{t("refunds")}</h3>
          <ul className="grid gap-1 text-muted-foreground text-sm">
            {refunds.map((step) => (
              <li key={step.days_before}>
                {t("refundStep", {
                  days: n(step.days_before),
                  percent: n(step.percent),
                })}
              </li>
            ))}
            <li>{t(refunds.length > 0 ? "refundAfter" : "noRefund")}</li>
            <li>{t("visa", { percent: n(program.visa_refund_rate) })}</li>
            <li>{t("calledOff")}</li>
          </ul>
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs">
        {t.rich("policy", {
          link: (chunks) => (
            <Link className="underline" href="/legal/programs">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </section>
  );
};
