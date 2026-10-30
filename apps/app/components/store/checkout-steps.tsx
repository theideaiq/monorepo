"use client";

import { cn } from "@repo/design-system/lib/utils";
import { useTranslations } from "next-intl";

const STEPS = ["cart", "delivery", "done"] as const;

/** Where checkout is: Cart → Delivery and payment → Done. */
export const CheckoutSteps = ({
  current,
}: {
  readonly current: (typeof STEPS)[number];
}) => {
  const t = useTranslations("app.checkout.steps");
  return (
    <ol aria-label={t("label")} className="flex flex-wrap gap-x-2 text-sm">
      {STEPS.map((step, index) => (
        <li
          aria-current={step === current ? "step" : undefined}
          className={cn(
            "flex items-center gap-2",
            step === current
              ? "font-semibold text-foreground"
              : "text-muted-foreground"
          )}
          key={step}
        >
          {index > 0 ? (
            <span aria-hidden="true" className="inline-block rtl:rotate-180">
              →
            </span>
          ) : null}
          {t(step)}
        </li>
      ))}
    </ol>
  );
};
