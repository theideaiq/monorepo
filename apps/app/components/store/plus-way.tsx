"use client";

import { useAuth } from "@repo/auth/provider";
import { formatPrice, planName } from "@repo/commerce";
import type { ProductDetail } from "@repo/commerce/catalog";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { orderPath, useKeepRental } from "@/lib/order-checkout";
import { cheapestMonthly, soloPlans } from "@/lib/plus";
import {
  meetsTier,
  planForTier,
  useKeepPrice,
  usePlusAvailability,
  useRentalAllowance,
  useRentals,
} from "@/lib/plus-queries";
import { usePlans } from "@/lib/queries";
import { queuePlace, useAddToQueue, useQueue } from "@/lib/queue-queries";
import { AvailabilityWord } from "./cover-card";

/** The one pink action the chosen way of getting a product leads to. */
export interface Primary {
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly href?: string;
  readonly label: string;
  readonly onClick?: () => void;
}

export type PlusState =
  | "atHome"
  | "member"
  | "onTheWay"
  | "queued"
  | "tierTooLow"
  | "visitor";

interface PlusWay {
  detail: ReactNode;
  primary: Primary;
  state: PlusState;
}

type T = ReturnType<typeof useTranslations<"app.store.getIt.plus">>;
type Rental = NonNullable<ReturnType<typeof useRentals>["data"]>[number];

/** At home: since when, Send it back, and Keep it at its price. */
const useAtHome = (home: Rental | undefined, t: T): PlusWay | null => {
  const locale = useLocale();
  const router = useRouter();
  const out = home && home.status !== "requested" ? home : undefined;
  const keepPrice = useKeepPrice(out?.id ?? null).data;
  const keep = useKeepRental();
  if (!home) {
    return null;
  }
  if (!out) {
    return {
      detail: <span className="text-sm">{t("onTheWay")}</span>,
      primary: { href: "/pass/at-home", label: t("seeAtHome") },
      state: "onTheWay",
    };
  }
  const keepIt: Primary =
    keepPrice === undefined || keepPrice === null
      ? { href: "/pass/at-home", label: t("seeAtHome") }
      : {
          busy: keep.isPending,
          label: t("keep", { price: formatPrice(keepPrice, locale) }),
          onClick: () =>
            keep.mutate(
              { paymentMethod: "online", rentalId: out.id },
              {
                onSuccess: ({ order, url }) => {
                  if (!url) {
                    router.push(orderPath(order.id));
                  }
                },
              }
            ),
        };
  return {
    detail: (
      <>
        <span className="text-sm">
          {t("atHome", {
            date: formatDate(out.started_at ?? out.requested_at, locale),
          })}
        </span>
        <Link
          className="font-medium text-pink-text text-sm hover:underline"
          href="/pass/at-home"
        >
          {t("sendBack")}
        </Link>
        {keep.isError ? (
          <span className="text-destructive text-sm" role="alert">
            {t("keepFailed")}
          </span>
        ) : null}
      </>
    ),
    primary: keepIt,
    state: "atHome",
  };
};

/** A member covered by their plan: queue it, or where it is in the queue. */
const useQueueWay = (productId: string, word: ReactNode, t: T): PlusWay => {
  const locale = useLocale();
  const queue = useQueue();
  const add = useAddToQueue();
  const place = queuePlace(queue.items, productId);
  if (place !== null) {
    const label = t("inQueue", { place: formatNumber(place, locale) });
    return {
      detail: (
        <>
          {word}
          <span className="text-sm">{label}</span>
        </>
      ),
      primary: { href: "/pass/queue", label },
      state: "queued",
    };
  }
  return {
    detail: (
      <>
        {word}
        {add.isError ? (
          <span className="text-destructive text-sm" role="alert">
            {t("queueFailed")}
          </span>
        ) : null}
      </>
    ),
    primary: {
      busy: add.isPending,
      label: t("addToQueue"),
      onClick: () => add.mutate(productId),
    },
    state: "member",
  };
};

/**
 * The Plus row of a product's "Get it" panel, for a product in Plus: who
 * is looking decides what it says and what the primary does. A visitor
 * (or someone without Plus) joins; a member queues it ("In your queue ·
 * #3" once queued); a member whose plan is too low upgrades; a member who
 * has it at home keeps it or sends it back.
 */
export const usePlusWay = (
  product: Pick<ProductDetail, "id" | "rentable" | "rental_tier">
): (PlusWay & { title: string }) | null => {
  const t = useTranslations("app.store.getIt.plus");
  const tBilling = useTranslations("billing");
  const locale = useLocale();
  const { user } = useAuth();
  const allowance = useRentalAllowance().data;
  const plans = usePlans("plus").data ?? [];
  const availability = usePlusAvailability(product.id, product.rentable).data;
  const home = (useRentals().data ?? []).find(
    (rental) =>
      rental.product_id === product.id &&
      ["active", "overdue", "requested"].includes(rental.status)
  );
  const word = availability ? <AvailabilityWord value={availability} /> : null;
  const atHome = useAtHome(home, t);
  const queued = useQueueWay(product.id, word, t);

  if (!product.rentable) {
    return null;
  }
  const title = t("title");
  if (!(user && (allowance?.slots ?? 0) > 0)) {
    const from = cheapestMonthly(plans);
    return {
      detail: (
        <>
          {from ? (
            <span className="font-mono text-sm">
              {t("from", {
                per: tBilling("perMonth"),
                price: formatPrice(from.amount, locale),
              })}
            </span>
          ) : null}
          {word}
        </>
      ),
      primary: { href: "/plus/plans", label: t("join") },
      state: "visitor",
      title,
    };
  }
  if (atHome) {
    return { ...atHome, title };
  }
  if (allowance && !meetsTier(product.rental_tier, allowance.tier)) {
    const needed = planForTier(soloPlans(plans), product.rental_tier ?? 0);
    return {
      detail: (
        <span className="text-sm">
          {needed
            ? t("withPlan", { plan: planName(needed, locale) })
            : t("higherPlan")}
        </span>
      ),
      primary: { href: "/plus/plan", label: t("upgrade") },
      state: "tierTooLow",
      title,
    };
  }
  return { ...queued, title };
};
