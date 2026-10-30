"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { useQuery } from "@tanstack/react-query";
import { HistoryIcon, HouseIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { SwapPanel } from "@/components/plus/plus-tools";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useMyDuo } from "@/lib/duo";
import { toRentalError } from "@/lib/errors";
import { orderPath, useKeepRental } from "@/lib/order-checkout";
import {
  useCancelRental,
  useRentalAllowance,
  useRentals,
} from "@/lib/plus-queries";
import { unwrap } from "@/lib/queries";

type Rental = NonNullable<ReturnType<typeof useRentals>["data"]>[number];

/** Rentals that are the member's now: on the way, at home, or late. */
export const AT_HOME_STATUSES = ["requested", "active", "overdue"] as const;

export const isAtHome = (rental: Pick<Rental, "kind" | "status">) =>
  rental.kind === "plus" &&
  (AT_HOME_STATUSES as readonly string[]).includes(rental.status);

/** Rentals that ended: back with us, kept, or cancelled. */
export const isPast = (rental: Pick<Rental, "status">) =>
  !(AT_HOME_STATUSES as readonly string[]).includes(rental.status);

/** keep_price(): what keeping a Plus rental's copy costs. */
const useKeepItPrice = (rentalId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(await supabase.rpc("keep_price", { target: rentalId })),
    queryKey: ["keep-price", rentalId],
  });
};

/** Keep it: buy the rented copy, less the plan's monthly price. */
const KeepIt = ({ rentalId }: { readonly rentalId: string }) => {
  const t = useTranslations("app.plus.rentals");
  const locale = useLocale();
  const router = useRouter();
  const price = useKeepItPrice(rentalId).data;
  const keep = useKeepRental();

  if (price === undefined || price === null) {
    return null;
  }
  return (
    <div className="grid justify-items-end gap-1">
      <Button
        disabled={keep.isPending || keep.isSuccess}
        onClick={() =>
          keep.mutate(
            { paymentMethod: "online", rentalId },
            {
              onSuccess: ({ order, url }) => {
                if (!url) {
                  router.push(orderPath(order.id));
                }
              },
            }
          )
        }
        size="sm"
        variant="outline"
      >
        {keep.isPending
          ? t("keeping")
          : t("keep", { price: formatPrice(price, locale) })}
      </Button>
      {keep.isError ? (
        <p className="text-destructive text-xs" role="alert">
          {keep.error.message.includes("Already being kept")
            ? t("keepPending")
            : t("keepFailed")}
        </p>
      ) : null}
    </div>
  );
};

/** A rental's state in words: "Due back 12 Nov", "On its way", "Late". */
const RentalState = ({ rental }: { readonly rental: Rental }) => {
  const t = useTranslations("app.pass.atHome");
  const locale = useLocale();
  if (rental.status === "requested") {
    return <span>{t("onItsWay")}</span>;
  }
  if (rental.status === "overdue") {
    return (
      <span className="font-medium text-warning">
        {rental.due_at
          ? t("late", { date: formatDate(rental.due_at, locale) })
          : t("lateNoDate")}
      </span>
    );
  }
  return (
    <span>
      {rental.due_at
        ? t("dueBack", { date: formatDate(rental.due_at, locale) })
        : t("since", {
            date: formatDate(rental.started_at ?? rental.requested_at, locale),
          })}
    </span>
  );
};

/**
 * `/pass/at-home`: the Plus items at home (and on their way), how many of
 * the plan's slots they use, Keep it, and sending them back with a swap.
 */
export const AtHome = () => {
  const t = useTranslations("app.pass.atHome");
  const tPlus = useTranslations("app.plus");
  const locale = useLocale();
  const rentals = useRentals();
  const allowance = useRentalAllowance().data;
  const duo = useMyDuo().data;
  const cancel = useCancelRental();
  const home = (rentals.data ?? []).filter(isAtHome);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        {allowance && allowance.slots > 0 ? (
          <p className="font-medium">
            {t("slots", {
              slots: formatNumber(allowance.slots, locale),
              used: formatNumber(allowance.used, locale),
            })}
          </p>
        ) : null}
        {rentals.isPending ? <SectionSpinner /> : null}
        {rentals.isError ? (
          <ErrorState onRetry={() => rentals.refetch()} />
        ) : null}
        {rentals.data && home.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HouseIcon />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("empty")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button asChild>
                <Link href="/pass/queue">{t("toQueue")}</Link>
              </Button>
            </EmptyContent>
          </Empty>
        ) : null}
        {home.length > 0 ? (
          <ul className="divide-y rounded-lg border bg-card">
            {home.map((rental) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 p-4"
                key={rental.id}
              >
                <div className="grid min-w-0 gap-1 text-sm">
                  <span className="font-medium">
                    {localized(rental, "name", locale)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    <RentalState rental={rental} />
                  </span>
                </div>
                {rental.status === "requested" && rental.swap_id === null ? (
                  <Button
                    disabled={cancel.isPending}
                    onClick={() => cancel.mutate(rental.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {cancel.isPending && cancel.variables === rental.id
                      ? tPlus("rentals.cancelling")
                      : tPlus("rentals.cancel")}
                  </Button>
                ) : null}
                {rental.status === "requested" ? null : (
                  <KeepIt rentalId={rental.id} />
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {cancel.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {tPlus(`errors.${toRentalError(cancel.error)}`)}
          </p>
        ) : null}
        {allowance && allowance.slots > 0 ? (
          <SwapPanel duo={duo} inUse={allowance.used} slots={allowance.slots} />
        ) : null}
        <Link
          className="inline-flex min-h-11 items-center self-start font-medium text-pink-text text-sm hover:underline"
          href="/pass/history"
        >
          {t("history")}
        </Link>
      </div>
    </>
  );
};

/** `/pass/history`: the rentals that ended, newest first. */
export const RentalHistory = () => {
  const t = useTranslations("app.pass.history");
  const tStatus = useTranslations("store.rentalStatus");
  const locale = useLocale();
  const rentals = useRentals();
  const past = (rentals.data ?? []).filter(isPast);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="flex max-w-3xl flex-1 flex-col gap-6">
        {rentals.isPending ? <SectionSpinner /> : null}
        {rentals.isError ? (
          <ErrorState onRetry={() => rentals.refetch()} />
        ) : null}
        {rentals.data && past.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("empty")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : null}
        {past.length > 0 ? (
          <ul className="divide-y rounded-lg border bg-card">
            {past.map((rental) => (
              <li className="grid gap-0.5 p-4 text-sm" key={rental.id}>
                <span className="font-medium">
                  {localized(rental, "name", locale)}
                </span>
                <span className="text-muted-foreground text-xs">
                  {tStatus(rental.status)}
                  {rental.returned_at
                    ? ` · ${t("returnedOn", { date: formatDate(rental.returned_at, locale) })}`
                    : ""}
                  {rental.order_id ? " · " : ""}
                  {rental.order_id ? (
                    <Link
                      className="font-medium text-pink-text hover:underline"
                      href={orderPath(rental.order_id)}
                    >
                      {t("order")}
                    </Link>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
};
