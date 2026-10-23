import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { Plan } from "@/lib/data";

interface PlanCardProps {
  readonly href: string;
  readonly locale: Locale;
  readonly plan: Plan;
}

/** A subscription plan from the `plans` table, with a link to subscribe. */
export const PlanCard = async ({ href, locale, plan }: PlanCardProps) => {
  const t = await getTranslations({ locale, namespace: "web.plus.plans" });
  const features = locale === "en" ? plan.features_en : plan.features_ar;
  const fallback = locale === "en" ? plan.features_ar : plan.features_en;
  const list = features.length > 0 ? features : fallback;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 first:border-muted even:border-primary even:shadow-lg">
      <div className="flex flex-col gap-2">
        <h3 className="font-semibold text-xl">{plan.name}</h3>
        <p className="flex items-baseline gap-2">
          <span className="font-bold text-3xl">
            {formatPrice(plan.amount, locale)}
          </span>
          <span className="text-muted-foreground text-sm">
            {plan.billing_interval === "year" ? t("perYear") : t("perMonth")}
          </span>
        </p>
        {plan.rental_slots ? (
          <p className="font-medium text-primary text-sm">
            {t("slots", {
              count: plan.rental_slots,
              slots: formatNumber(plan.rental_slots, locale),
            })}
          </p>
        ) : null}
      </div>
      <ul className="flex flex-1 flex-col gap-2 text-sm">
        {list.map((feature) => (
          <li className="flex gap-2" key={feature}>
            <Check
              aria-hidden="true"
              className="mt-0.5 size-4 shrink-0 text-primary"
            />
            {feature}
          </li>
        ))}
      </ul>
      <Button asChild className="w-full">
        <a href={href}>{t("choose", { plan: plan.name })}</a>
      </Button>
    </div>
  );
};
