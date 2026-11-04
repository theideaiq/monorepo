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
import { costSummary, itineraryOf, onTopKind } from "@/lib/program-costs";

interface Installment {
  due_on?: string;
  percent: number;
}

interface RefundStep {
  days_before: number;
  percent: number;
}

const day = (value: string) => new Date(`${value}T12:00:00`);

/** Day by day, in day order; nothing when the program has no itinerary. */
const ProgramItinerary = async ({
  itinerary,
  locale,
}: {
  readonly itinerary: unknown;
  readonly locale: Locale;
}) => {
  const steps = itineraryOf(itinerary);
  if (steps.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.programs" });
  const ar = locale === "ar";
  return (
    <div className="grid gap-2">
      <h3 className="font-medium">{t("itinerary")}</h3>
      <ol className="grid gap-2 text-sm">
        {steps.map((step) => {
          const detail = ar ? step.detail_ar : step.detail_en;
          return (
            <li className="grid gap-0.5" key={`${step.day}:${step.title_en}`}>
              <p>
                <span className="font-medium">
                  {t("itineraryDay", { day: formatNumber(step.day, locale) })}
                </span>
                {" · "}
                {ar ? step.title_ar : step.title_en}
              </p>
              {detail ? (
                <p className="whitespace-pre-line text-muted-foreground">
                  {detail}
                </p>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/**
 * What it costs: the package price, then every cost line (included, or
 * paid on top with its amount or "varies") and what's known to be paid on
 * top. Nothing when the program lists no costs.
 */
const ProgramCosts = async ({
  costs,
  locale,
  priceText,
}: {
  readonly costs: unknown;
  readonly locale: Locale;
  readonly priceText: string;
}) => {
  const summary = costSummary(costs);
  const lines = [...summary.included, ...summary.extras];
  if (lines.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.programs" });
  const amount = formatPrice(summary.knownExtra, locale);
  const onTop = {
    atLeast: t("onTopAtLeast", { amount }),
    exact: t("onTop", { amount }),
    none: null,
    varies: t("onTopVaries"),
  }[onTopKind(summary)];
  const costText = (line: (typeof lines)[number]) => {
    if (line.included) {
      return t("costIncluded");
    }
    return typeof line.amount === "number"
      ? formatPrice(line.amount, locale)
      : t("costVaries");
  };
  return (
    <div className="grid gap-2">
      <h3 className="font-medium">{t("costs")}</h3>
      <dl className="grid gap-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt>{t("packagePrice")}</dt>
          <dd className="font-medium">{priceText}</dd>
        </div>
        {lines.map((line) => (
          <div
            className="flex justify-between gap-4 text-muted-foreground"
            key={`${line.label_en}:${line.label_ar}`}
          >
            <dt>{locale === "ar" ? line.label_ar : line.label_en}</dt>
            <dd className="shrink-0">{costText(line)}</dd>
          </div>
        ))}
      </dl>
      {onTop ? <p className="font-medium text-sm">{onTop}</p> : null}
    </div>
  );
};

/**
 * What one of The IDEA's programs is sold as: the price (and Plus price),
 * what's included, the itinerary day by day, every cost (in the price or
 * on top), insurance and a chaperone, the ages, the installments and the
 * refund schedule, as the programs policy promises.
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
  const priceText =
    program.price > 0 ? formatPrice(program.price, locale) : t("free");

  return (
    <section className="grid gap-4 rounded-lg border p-5">
      <div className="grid gap-1">
        <h2 className="font-semibold text-xl">{t("package")}</h2>
        <p className="font-semibold text-2xl">{priceText}</p>
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
      <ProgramItinerary itinerary={program.itinerary} locale={locale} />
      <ProgramCosts
        costs={program.costs}
        locale={locale}
        priceText={priceText}
      />
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
