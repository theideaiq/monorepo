import { formatPrice, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Plan } from "@/lib/data";

interface PlanCardProps {
  /** The featured plan: a 2px pink border and a pink flag. */
  readonly featured?: boolean;
  readonly href: string;
  readonly locale: Locale;
  readonly plan: Plan;
}

/** A subscription plan from the `plans` table, with a link to subscribe. */
export const PlanCard = async ({
  featured = false,
  href,
  locale,
  plan,
}: PlanCardProps) => {
  const t = await getTranslations({ locale, namespace: "web.plus.plans" });
  const features = locale === "en" ? plan.features_en : plan.features_ar;
  const fallback = locale === "en" ? plan.features_ar : plan.features_en;
  const list = features.length > 0 ? features : fallback;

  return (
    <div
      className={cn(
        "relative flex flex-col gap-6 rounded-xl border bg-card p-6 shadow-1",
        featured && "border-2 border-idea-pink shadow-2"
      )}
    >
      {featured ? (
        <span className="absolute start-6 -top-3 rounded-full bg-idea-pink px-3 py-1 font-semibold text-on-pink text-xs">
          {t("featured")}
        </span>
      ) : null}
      <div className="flex flex-col gap-2">
        <h3 className="text-h3">{planName(plan, locale)}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-bold font-mono text-3xl tabular-nums">
            {formatPrice(plan.amount, locale)}
          </span>
          <span className="text-muted-foreground text-sm">
            {plan.billing_interval === "year" ? t("perYear") : t("perMonth")}
          </span>
        </p>
        {plan.rental_slots ? (
          <p className="font-medium text-pink-text text-sm">
            {t("slots", {
              count: plan.rental_slots,
              slots: formatNumber(plan.rental_slots, locale),
            })}
          </p>
        ) : null}
        {plan.bulb_rate === null ? null : (
          <p className="text-muted-foreground text-sm">
            {t("bulbs", { rate: formatNumber(Number(plan.bulb_rate), locale) })}
          </p>
        )}
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {list.map((feature) => (
          <li className="flex gap-2" key={feature}>
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-pink-text"
            />
            {feature}
          </li>
        ))}
      </ul>
      <Button
        asChild
        className="w-full"
        size="lg"
        variant={featured ? "default" : "outline"}
      >
        <a href={href}>{t("choose", { plan: planName(plan, locale) })}</a>
      </Button>
    </div>
  );
};
