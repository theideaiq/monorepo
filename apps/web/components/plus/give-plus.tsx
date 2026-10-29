"use client";

import { formatPrice, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatNumber } from "@repo/internationalization/format";
import { useRouter } from "@repo/internationalization/navigation";
import { GiftIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { GIFT_MONTHS, useAddPlusGiftToCart } from "@/lib/plus-gifts";
import { usePlans } from "@/lib/queries";
import { useCanSellDigitalGoods } from "@/lib/use-digital-checkout";

/**
 * "Give Plus": prepaid months of a monthly plan, put in the cart and sent
 * with Send as a gift. The recipient claims them from the link.
 */
export const GivePlus = () => {
  const t = useTranslations("app.plus.give");
  const tBilling = useTranslations("billing");
  const locale = useLocale();
  const router = useRouter();
  const canSell = useCanSellDigitalGoods();
  const add = useAddPlusGiftToCart();
  // Monthly plans (usePlans has no student prices: the recipient may not
  // be a student).
  const plans = (usePlans("plus").data ?? []).filter(
    (option) => option.billing_interval === "month"
  );
  const [chosen, setPlan] = useState<string | null>(null);
  const [months, setMonths] = useState<number>(3);
  const plan = plans.find(({ id }) => id === chosen) ?? plans[0];

  if (!plan) {
    return null;
  }

  return (
    <Card id="give">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GiftIcon className="size-5" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-medium text-sm">{t("plan")}</legend>
          <div className="flex flex-wrap gap-2">
            {plans.map((option) => (
              <Button
                aria-pressed={option.id === plan.id}
                key={option.id}
                onClick={() => setPlan(option.id)}
                size="sm"
                type="button"
                variant={option.id === plan.id ? "default" : "outline"}
              >
                {planName(option, locale)}
              </Button>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="mb-2 font-medium text-sm">{t("months")}</legend>
          <div className="flex flex-wrap gap-2">
            {GIFT_MONTHS.map((count) => (
              <Button
                aria-pressed={count === months}
                key={count}
                onClick={() => setMonths(count)}
                size="sm"
                type="button"
                variant={count === months ? "default" : "outline"}
              >
                {t("monthsOption", {
                  count,
                  months: formatNumber(count, locale),
                })}
              </Button>
            ))}
          </div>
        </fieldset>
        <p className="text-sm">
          <span className="font-semibold text-lg tabular-nums">
            {formatPrice(plan.amount * months, locale)}
          </span>{" "}
          <span className="text-muted-foreground">
            {t("each", {
              per: tBilling("perMonth"),
              price: formatPrice(plan.amount, locale),
            })}
          </span>
        </p>
        <p className="text-muted-foreground text-xs">{t("note")}</p>
        {canSell === false ? (
          <p className="rounded-md bg-muted p-4 text-sm">
            {tBilling("webOnly")}
          </p>
        ) : null}
        {add.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </CardContent>
      {canSell === true ? (
        <CardFooter>
          <Button
            disabled={add.isPending}
            onClick={() =>
              add.mutate(
                { months, plan: plan.id },
                { onSuccess: () => router.push("/cart") }
              )
            }
            type="button"
          >
            {add.isPending ? t("adding") : t("addToCart")}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
};
