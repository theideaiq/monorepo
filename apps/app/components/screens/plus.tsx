"use client";

import { localized } from "@repo/commerce";
import type { ProductCard } from "@repo/commerce/catalog";
import type { RentalStatus } from "@repo/database";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@repo/internationalization/format";
import { getPurchasePolicy } from "@repo/payments";
import { CheckIcon, CrownIcon, SearchIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { ProductImage } from "@/components/store/product-image";
import {
  hasPendingCheckout,
  reportCompletedCheckout,
} from "@/lib/checkout-tracking";
import { toRentalError } from "@/lib/errors";
import { detectPlatform } from "@/lib/platform";
import {
  isLiveMembership,
  meetsTier,
  planForTier,
  type RentalAllowance,
  useCancelRental,
  usePlanCheckout,
  useRentalAllowance,
  useRentals,
  useRentalTiers,
  useRequestRental,
} from "@/lib/plus-queries";
import { usePlans, usePlusPayments, usePlusSubscription } from "@/lib/queries";
import { useProducts } from "@/lib/store-queries";

const POLL_MS = 3000;

const RENTAL_BADGE: Record<
  RentalStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  active: "default",
  cancelled: "outline",
  overdue: "destructive",
  requested: "secondary",
  returned: "outline",
};

const Membership = ({
  allowance,
  confirming,
}: {
  readonly allowance: RentalAllowance | undefined;
  readonly confirming: boolean;
}) => {
  const t = useTranslations("app.plus.membership");
  const tBilling = useTranslations("billing.status");
  const locale = useLocale();
  const plans = usePlans("plus");
  const subscription = usePlusSubscription(confirming ? POLL_MS : false);
  const plan = plans.data?.find(
    (item) => item.id === subscription.data?.plan_id
  );
  const live = subscription.data;

  return (
    <Card className="border-brand/40 bg-gradient-to-br from-brand/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CrownIcon className="size-5 text-brand" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {live && plan ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {t("plan", { plan: plan.name })}
              </span>
              <Badge variant="secondary">{tBilling(live.status)}</Badge>
              {live.current_period_end ? (
                <span>
                  {live.cancel_at_period_end
                    ? t("ends", {
                        date: formatDate(live.current_period_end, locale),
                      })
                    : t("renews", {
                        date: formatDate(live.current_period_end, locale),
                      })}
                </span>
              ) : null}
            </span>
          ) : (
            t("none")
          )}
        </CardDescription>
      </CardHeader>
      {confirming ? (
        <CardContent>
          <p className="text-sm" role="status">
            {t("confirming")}
          </p>
        </CardContent>
      ) : null}
      {allowance && allowance.slots > 0 ? (
        <CardContent className="grid gap-2">
          <span className="text-muted-foreground text-sm">
            {t("allowance")}
          </span>
          <div className="flex items-center gap-3">
            <div aria-hidden="true" className="flex flex-1 gap-1">
              {Array.from({ length: allowance.slots }, (_, index) => (
                <span
                  className={
                    index < allowance.used
                      ? "h-2 flex-1 rounded-full bg-primary"
                      : "h-2 flex-1 rounded-full bg-muted"
                  }
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed slots
                  key={index}
                />
              ))}
            </div>
            <span className="font-medium text-sm tabular-nums">
              {t("slots", {
                free: formatNumber(allowance.free, locale),
                slots: formatNumber(allowance.slots, locale),
              })}
            </span>
          </div>
        </CardContent>
      ) : null}
    </Card>
  );
};

const Plans = ({ onStarted }: { readonly onStarted: () => void }) => {
  const t = useTranslations("app.plus.plans");
  const tBilling = useTranslations("billing");
  const locale = useLocale();
  const plans = usePlans("plus");
  const subscription = usePlusSubscription();
  const checkout = usePlanCheckout("/plus");
  const policy = getPurchasePolicy(detectPlatform());
  const member = isLiveMembership(subscription.data?.status);

  return (
    <section className="grid gap-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      {policy.allowed ? null : (
        <p className="rounded-md bg-muted p-4 text-sm">{tBilling("webOnly")}</p>
      )}
      {plans.isPending ? <SectionSpinner /> : null}
      {plans.isError ? <ErrorState onRetry={() => plans.refetch()} /> : null}
      {plans.data?.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-3">
        {plans.data?.map((plan) => {
          const current = plan.id === subscription.data?.plan_id && member;
          const price = formatCurrency(plan.amount, locale, plan.currency);
          const features =
            locale === "en" ? plan.features_en : plan.features_ar;
          return (
            <Card
              className={current ? "border-primary" : undefined}
              key={plan.id}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {plan.name}
                  {current ? <Badge>{t("current")}</Badge> : null}
                </CardTitle>
                <CardDescription>
                  <span className="font-semibold text-2xl text-foreground tabular-nums">
                    {price}
                  </span>{" "}
                  {plan.billing_interval === "year"
                    ? tBilling("perYear")
                    : tBilling("perMonth")}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid flex-1 content-start gap-2 text-sm">
                {plan.rental_slots ? (
                  <p className="font-medium">
                    {t("slots", {
                      count: formatNumber(plan.rental_slots, locale),
                    })}
                  </p>
                ) : null}
                {features.length ? (
                  <ul className="grid gap-1.5">
                    {features.map((feature) => (
                      <li className="flex gap-2" key={feature}>
                        <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CardContent>
              {policy.allowed && !member ? (
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={checkout.isPending}
                    onClick={() =>
                      checkout.mutate(plan, { onSuccess: onStarted })
                    }
                  >
                    {checkout.isPending && checkout.variables?.id === plan.id
                      ? t("redirecting")
                      : t("subscribe", { amount: price })}
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          );
        })}
      </div>
      {checkout.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </section>
  );
};

const RentalItem = ({
  allowance,
  member,
  planName,
  product,
  requiredTier,
}: {
  readonly allowance: RentalAllowance | undefined;
  readonly member: boolean;
  /** The plan that unlocks the item, when it needs a higher one. */
  readonly planName: string | null;
  readonly product: ProductCard;
  readonly requiredTier: number | undefined;
}) => {
  const t = useTranslations("app.plus");
  const locale = useLocale();
  const request = useRequestRental();
  const name = localized(product, "name", locale);
  const available = product.stock_count > 0;
  const noSlots = member && allowance !== undefined && allowance.free <= 0;
  // Unknown until the allowance loads: let the database decide then.
  const tierTooLow =
    member &&
    allowance !== undefined &&
    !meetsTier(requiredTier, allowance.tier);

  let hint: string | null = null;
  if (!member) {
    hint = t("catalog.needMembership");
  } else if (tierTooLow) {
    hint = planName
      ? t("catalog.upgradeTo", { plan: planName })
      : t("catalog.upgrade");
  } else if (noSlots) {
    hint = t("catalog.noSlots");
  }

  return (
    <li className="grid content-start gap-2">
      <ProductImage alt={name} path={product.images[0]} />
      <span className="line-clamp-2 font-medium text-sm">{name}</span>
      {requiredTier ? (
        <Badge className="justify-self-start" variant="outline">
          <CrownIcon className="text-brand" />
          {planName
            ? t("catalog.needsPlan", { plan: planName })
            : t("catalog.needsHigherPlan")}
        </Badge>
      ) : null}
      <span className="text-muted-foreground text-xs">
        {available
          ? t("catalog.available", {
              count: formatNumber(product.stock_count, locale),
            })
          : t("catalog.unavailable")}
      </span>
      {request.isSuccess ? (
        <p
          className="text-emerald-700 text-xs dark:text-emerald-300"
          role="status"
        >
          {t("catalog.requested")}
        </p>
      ) : (
        <Button
          disabled={
            !(member && available) || noSlots || tierTooLow || request.isPending
          }
          onClick={() => request.mutate(product.id)}
          size="sm"
          variant="outline"
        >
          {request.isPending ? t("catalog.requesting") : t("catalog.request")}
        </Button>
      )}
      {hint && available && !request.isSuccess ? (
        <span className="text-muted-foreground text-xs">{hint}</span>
      ) : null}
      {request.isError ? (
        <p className="text-destructive text-xs" role="alert">
          {t(`errors.${toRentalError(request.error)}`)}
        </p>
      ) : null}
    </li>
  );
};

const RentalCatalogItem = ({
  plans,
  requiredTier,
  ...props
}: {
  readonly allowance: RentalAllowance | undefined;
  readonly member: boolean;
  readonly plans: readonly { name: string; tier: number | null }[] | undefined;
  readonly product: ProductCard;
  readonly requiredTier: number | undefined;
}) => (
  <RentalItem
    {...props}
    planName={
      requiredTier ? (planForTier(plans, requiredTier)?.name ?? null) : null
    }
    requiredTier={requiredTier}
  />
);

const RentalCatalog = ({
  allowance,
  member,
}: {
  readonly allowance: RentalAllowance | undefined;
  readonly member: boolean;
}) => {
  const t = useTranslations("app.plus.catalog");
  const [search, setSearch] = useState("");
  const products = useProducts({
    kind: "rental",
    limit: 48,
    search: search.trim() || undefined,
  });
  const tiers = useRentalTiers(
    products.data?.map((product) => product.id) ?? []
  );
  const plans = usePlans("plus");

  return (
    <section className="grid gap-4">
      <div className="grid gap-1">
        <h2 className="font-semibold text-lg">{t("title")}</h2>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      <search className="relative max-w-md">
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label={t("search")}
          className="ps-9"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("search")}
          type="search"
          value={search}
        />
      </search>
      {products.isPending ? <SectionSpinner /> : null}
      {products.isError ? (
        <ErrorState onRetry={() => products.refetch()} />
      ) : null}
      {products.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : null}
      {products.data?.length ? (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-5">
          {products.data.map((product) => (
            <RentalCatalogItem
              allowance={allowance}
              key={product.id}
              member={member}
              plans={plans.data ?? undefined}
              product={product}
              requiredTier={tiers.data?.get(product.id)}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
};

const MyRentals = () => {
  const t = useTranslations("app.plus");
  const tStatus = useTranslations("store.rentalStatus");
  const locale = useLocale();
  const rentals = useRentals();
  const cancel = useCancelRental();

  return (
    <section className="grid gap-4">
      <h2 className="font-semibold text-lg">{t("rentals.title")}</h2>
      {rentals.isPending ? <SectionSpinner /> : null}
      {rentals.isError ? (
        <ErrorState onRetry={() => rentals.refetch()} />
      ) : null}
      {rentals.data?.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("rentals.empty")}</p>
      ) : null}
      {rentals.data?.length ? (
        <ul className="divide-y rounded-xl border">
          {rentals.data.map((rental) => (
            <li
              className="flex flex-wrap items-center justify-between gap-3 p-4"
              key={rental.id}
            >
              <div className="grid min-w-0 gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">
                    {localized(rental, "name", locale)}
                  </span>
                  <Badge variant={RENTAL_BADGE[rental.status]}>
                    {tStatus(rental.status)}
                  </Badge>
                </div>
                <span className="text-muted-foreground text-xs">
                  {rental.returned_at
                    ? t("rentals.returnedOn", {
                        date: formatDate(rental.returned_at, locale),
                      })
                    : null}
                  {!rental.returned_at && rental.due_at
                    ? t("rentals.due", {
                        date: formatDate(rental.due_at, locale),
                      })
                    : null}
                  {rental.returned_at || rental.due_at
                    ? null
                    : t("rentals.requestedOn", {
                        date: formatDate(rental.requested_at, locale),
                      })}
                </span>
              </div>
              {rental.status === "requested" ? (
                <Button
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate(rental.id)}
                  size="sm"
                  variant="ghost"
                >
                  {cancel.isPending && cancel.variables === rental.id
                    ? t("rentals.cancelling")
                    : t("rentals.cancel")}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {cancel.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${toRentalError(cancel.error)}`)}
        </p>
      ) : null}
    </section>
  );
};

/** The IDEA Plus: membership, plans, the rental catalog and the member's rentals. */
export const Plus = () => {
  const t = useTranslations("app.plus");
  const [confirming, setConfirming] = useState(hasPendingCheckout);
  const subscription = usePlusSubscription();
  const allowance = useRentalAllowance();
  const payments = usePlusPayments(confirming ? POLL_MS : false);
  const member = isLiveMembership(subscription.data?.status);
  const refetchSubscription = subscription.refetch;
  const refetchAllowance = allowance.refetch;

  // Back from the payment page: report the purchase once it is confirmed.
  useEffect(() => {
    if (!(confirming && payments.data)) {
      return;
    }
    reportCompletedCheckout(payments.data);
    if (!hasPendingCheckout()) {
      setConfirming(false);
      refetchSubscription();
      refetchAllowance();
    }
  }, [confirming, payments.data, refetchAllowance, refetchSubscription]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex flex-1 flex-col gap-8 p-4 pt-0">
        <p className="max-w-2xl text-muted-foreground">{t("description")}</p>
        <Membership allowance={allowance.data} confirming={confirming} />
        <Plans onStarted={() => setConfirming(hasPendingCheckout())} />
        <MyRentals />
        <RentalCatalog allowance={allowance.data} member={member} />
      </div>
    </>
  );
};
