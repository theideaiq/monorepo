"use client";

import { localized, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import {
  formatCurrency,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CheckIcon, MinusIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useExtraSwapFee, usePlusAreas, WEEKDAYS } from "@/lib/plus-launch";

/** What the comparison needs of a plan (the `plans` row). */
export interface ComparedPlan {
  amount: number;
  bulb_rate?: number | string | null;
  currency: string;
  free_delivery?: boolean | null;
  home_swaps?: number | null;
  id: string;
  name: string;
  name_ar?: string | null;
  rental_slots: number | null;
  tier?: number | null;
}

/**
 * The plans side by side, from the plans themselves (Staff → Plus → Plans):
 * price, items at a time, home swaps, Bulbs back and free Store delivery,
 * with the policy that holds the rest.
 */
export const PlanCompare = ({
  per,
  plans,
}: {
  /** "a month" or "a year". */
  readonly per: string;
  readonly plans: readonly ComparedPlan[];
}) => {
  const t = useTranslations("app.plus.compare");
  const locale = useLocale();
  if (plans.length < 2) {
    return null;
  }
  const yes = (value: boolean) =>
    value ? (
      <CheckIcon
        aria-label={t("yes")}
        className="mx-auto size-4 text-pink-text"
      />
    ) : (
      <MinusIcon
        aria-label={t("no")}
        className="mx-auto size-4 text-muted-foreground"
      />
    );
  const rows: {
    label: string;
    value: (plan: ComparedPlan) => React.ReactNode;
  }[] = [
    {
      label: t("price", { per }),
      value: (plan) => (
        <span className="font-mono">
          {formatCurrency(plan.amount, locale, plan.currency)}
        </span>
      ),
    },
    {
      label: t("items"),
      value: (plan) => formatNumber(plan.rental_slots ?? 0, locale),
    },
    {
      label: t("swaps"),
      value: (plan) => formatNumber(plan.home_swaps ?? 0, locale),
    },
    {
      label: t("bulbs"),
      value: (plan) =>
        plan.bulb_rate === null || plan.bulb_rate === undefined
          ? null
          : `${formatNumber(Number(plan.bulb_rate), locale)}%`,
    },
    {
      label: t("delivery"),
      value: (plan) => yes(Boolean(plan.free_delivery)),
    },
  ];

  return (
    <section aria-labelledby="plans-compare" className="grid gap-3">
      <h2 className="font-semibold text-lg" id="plans-compare">
        {t("title")}
      </h2>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full min-w-[28rem] text-sm">
          <thead className="bg-muted/50">
            <tr>
              <td className="p-3" />
              {plans.map((plan) => (
                <th
                  className="p-3 text-center font-semibold text-pink-text"
                  key={plan.id}
                  scope="col"
                >
                  {planName(plan, locale)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.label}>
                <th
                  className="min-w-36 p-3 text-start font-normal text-muted-foreground"
                  scope="row"
                >
                  {row.label}
                </th>
                {plans.map((plan) => (
                  <td
                    className="whitespace-nowrap p-3 text-center"
                    key={plan.id}
                  >
                    {row.value(plan)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-muted-foreground text-xs">
        {t("more")}{" "}
        <Link
          className="font-medium text-pink-text hover:underline"
          href="/legal/plus#section-2"
        >
          {t("policy")}
        </Link>
      </p>
    </section>
  );
};

/**
 * "Help me choose": how many things you want at once picks the plan with
 * that many items at a time; the cards and the comparison stay the plain
 * way to choose.
 */
export const PlanChooser = ({
  onPick,
  plans,
  selected,
}: {
  readonly onPick: (planId: string) => void;
  readonly plans: readonly ComparedPlan[];
  readonly selected: string | undefined;
}) => {
  const t = useTranslations("app.plus.chooser");
  const locale = useLocale();
  const options = plans.filter((plan) => (plan.rental_slots ?? 0) > 0);
  if (options.length < 2) {
    return null;
  }
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 font-medium text-sm">{t("question")}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((plan) => (
          <Button
            aria-pressed={plan.id === selected}
            className="rounded-full"
            key={plan.id}
            onClick={() => onPick(plan.id)}
            size="sm"
            type="button"
            variant={plan.id === selected ? "secondary" : "outline"}
          >
            {t("answer", {
              count: plan.rental_slots ?? 0,
              n: formatNumber(plan.rental_slots ?? 0, locale),
            })}
          </Button>
        ))}
      </div>
    </fieldset>
  );
};

/**
 * Before joining, what the chosen plan means at home: the price and when
 * it's billed, the home swaps it includes and what one more costs, and
 * the areas Plus delivers to with their day, from Staff's settings.
 */
export const BeforeYouJoin = ({
  per,
  plan,
}: {
  readonly per: string;
  readonly plan: ComparedPlan;
}) => {
  const t = useTranslations("app.plus.before");
  const tDays = useTranslations("app.plus.weekdays");
  const locale = useLocale();
  const fee = useExtraSwapFee().data;
  const areas = usePlusAreas().data ?? [];
  const swaps = plan.home_swaps ?? 0;

  return (
    <section
      aria-labelledby="before-you-join"
      className="grid gap-2 rounded-lg border bg-muted/30 p-4 text-sm"
    >
      <h3 className="font-semibold" id="before-you-join">
        {t("title")}
      </h3>
      <ul className="grid gap-1.5">
        <li>
          {t("price", {
            per,
            plan: planName(plan, locale),
            price: formatCurrency(plan.amount, locale, plan.currency),
          })}
        </li>
        {swaps > 0 ? (
          <li>
            {t("swaps", { count: swaps, n: formatNumber(swaps, locale) })}
            {fee === null || fee === undefined
              ? null
              : ` ${t("extraSwap", { fee: formatCurrency(fee, locale, plan.currency) })}`}
          </li>
        ) : null}
        <li>{t("leave")}</li>
      </ul>
      {areas.length > 0 ? (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center font-medium">
            {t("areas", {
              count: areas.length,
              n: formatNumber(areas.length, locale),
            })}
          </summary>
          <ul className={cn("grid gap-1 sm:grid-cols-2")}>
            {areas.map((area) => (
              <li className="flex justify-between gap-2" key={area.id}>
                <span>{localized(area, "name", locale)}</span>
                <span className="text-muted-foreground">
                  {area.weekday === null
                    ? null
                    : tDays(WEEKDAYS[area.weekday] ?? "sunday")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
};
