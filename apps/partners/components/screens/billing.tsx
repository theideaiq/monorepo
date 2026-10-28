"use client";

import { planName } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { formatCurrency, formatDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { reportCompletedCheckout } from "@/lib/checkout-tracking";
import { usePlanCheckout } from "@/lib/plus-queries";
import { usePayments, usePlans, useSubscription } from "@/lib/queries";

/** The active organization's Partners plan (`audience = 'business'`). */
const OrganizationBilling = () => {
  const t = useTranslations("billing");
  const locale = useLocale();
  const { active, canManage } = useActiveOrganization();
  const plans = usePlans("business");
  const subscription = useSubscription(active.id);
  const payments = usePayments(active.id, canManage);
  const checkout = usePlanCheckout("/organization/billing", active.id);
  // Digital goods can't use a third-party checkout inside the iOS/Android
  // apps (see @repo/payments policy and commerce.allowNativeCheckout).

  // Back from the hosted checkout: report the purchase once it is paid.
  useEffect(() => {
    if (payments.data) {
      reportCompletedCheckout(payments.data);
    }
  }, [payments.data]);

  const currentPlan = plans.data?.find(
    (plan) => plan.id === subscription.data?.plan_id
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t("description")}</p>

      <Card>
        <CardHeader>
          <CardTitle>{t("currentPlan")}</CardTitle>
          <CardDescription>
            {subscription.data && currentPlan ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-foreground">
                  {currentPlan.name}
                </span>
                <Badge variant="secondary">
                  {t(`status.${subscription.data.status}`)}
                </Badge>
                {subscription.data.current_period_end ? (
                  <span>
                    {t("renews", {
                      date: formatDate(
                        subscription.data.current_period_end,
                        locale
                      ),
                    })}
                  </span>
                ) : null}
              </span>
            ) : (
              t("noPlan")
            )}
          </CardDescription>
        </CardHeader>
      </Card>

      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("choosePlan")}</h2>
        {canManage ? null : (
          <p className="text-muted-foreground text-sm">{t("managersOnly")}</p>
        )}
        {plans.isPending ? <SectionSpinner /> : null}
        {plans.isError ? <ErrorState onRetry={() => plans.refetch()} /> : null}
        {plans.data?.length === 0 ? (
          <p className="text-muted-foreground">{t("noPlans")}</p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-3">
          {plans.data?.map((plan) => {
            const isCurrent = plan.id === subscription.data?.plan_id;
            const price = formatCurrency(plan.amount, locale, plan.currency);
            const features =
              locale === "en" ? plan.features_en : plan.features_ar;
            return (
              <Card
                className={isCurrent ? "border-primary" : undefined}
                key={plan.id}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    {planName(plan, locale)}
                    {isCurrent ? <Badge>{t("current")}</Badge> : null}
                  </CardTitle>
                  <CardDescription>
                    <span className="font-semibold text-2xl text-foreground tabular-nums">
                      {price}
                    </span>{" "}
                    {plan.billing_interval === "year"
                      ? t("perYear")
                      : t("perMonth")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid flex-1 content-between gap-4">
                  {features.length ? (
                    <ul className="grid gap-1.5 text-sm">
                      {features.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : null}
                  {canManage ? (
                    <Button
                      className="w-full"
                      disabled={checkout.isPending}
                      onClick={() => checkout.mutate(plan)}
                      variant={isCurrent ? "outline" : "default"}
                    >
                      {checkout.isPending && checkout.variables?.id === plan.id
                        ? t("redirecting")
                        : t("pay", { amount: price })}
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {checkout.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("errors.checkout")}
          </p>
        ) : null}
      </section>

      {canManage ? (
        <section className="grid gap-3">
          <h2 className="font-semibold text-lg">{t("payments")}</h2>
          {payments.data?.length ? (
            <ul className="divide-y rounded-md border">
              {payments.data.map((payment) => (
                <li
                  className="flex items-center justify-between gap-4 p-3 text-sm"
                  key={payment.id}
                >
                  <div className="grid gap-0.5">
                    <span>{payment.description}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(payment.created_at, locale)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="tabular-nums">
                      {formatCurrency(payment.amount, locale, payment.currency)}
                    </span>
                    <Badge variant="outline">
                      {t(`paymentStatus.${payment.status}`)}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">{t("noPayments")}</p>
          )}
        </section>
      ) : null}
    </div>
  );
};

export const Billing = () => (
  <BusinessShell organization>
    <OrganizationBilling />
  </BusinessShell>
);
