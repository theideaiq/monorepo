"use client";

import { formatPrice, localized, planName } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { ArrowDownIcon, ArrowUpIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { orderPath } from "@/lib/order-checkout";
import {
  useOpenSwap,
  usePlusActions,
  usePlusHome,
  usePlusPlanState,
  useSwapTerms,
} from "@/lib/plus-launch";
import { useRentals } from "@/lib/plus-queries";
import { usePlans } from "@/lib/queries";
import {
  useReorderSaved,
  useToggleWishlist,
  useWishlist,
} from "@/lib/wishlist-queries";

type PlusError =
  | "ending"
  | "failed"
  | "needsHome"
  | "needsTier"
  | "noPauseDays"
  | "noSlots"
  | "notForMinors"
  | "paused"
  | "swapBooked"
  | "unavailable";

/** Why a Plus action was refused, as a message key. */
const plusErrorKey = (error: Error | null): PlusError => {
  const message = error?.message ?? "";
  const known: [string, PlusError][] = [
    ["No free rental slots", "noSlots"],
    ["needs a higher plan", "needsTier"],
    ["All copies are rented out", "unavailable"],
    ["Item not available", "unavailable"],
    ["already booked", "swapBooked"],
    ["is paused", "paused"],
    ["ends at the end", "ending"],
    ["Add your Plus address", "needsHome"],
    ["Not enough pause days", "noPauseDays"],
    ["Not available under 18", "notForMinors"],
  ];
  return known.find(([text]) => message.includes(text))?.[1] ?? "failed";
};

/** The Saved items that can be rented, in the member's order. */
export const useQueue = () => {
  const wishlist = useWishlist();
  return (wishlist.data ?? []).filter(
    (item) => item.product?.rentable && item.product.status === "active"
  );
};

/**
 * The queue: Saved items to rent next, in order. Moving one up or down
 * reorders Saved itself.
 */
export const Queue = () => {
  const t = useTranslations("app.plus.queue");
  const locale = useLocale();
  const wishlist = useWishlist();
  const queue = useQueue();
  const reorder = useReorderSaved();
  const toggle = useToggleWishlist();

  const move = (productId: string, by: -1 | 1) => {
    const ids = (wishlist.data ?? []).map((item) => item.product_id);
    const queued = queue.map((item) => item.product_id);
    const at = queued.indexOf(productId);
    const swapWith = queued[at + by];
    if (swapWith === undefined) {
      return;
    }
    const from = ids.indexOf(productId);
    const to = ids.indexOf(swapWith);
    ids[from] = swapWith;
    ids[to] = productId;
    reorder.mutate(ids);
  };

  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="font-semibold">{t("title")}</h3>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>
      {queue.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("empty")}</p>
      ) : (
        <ol className="divide-y rounded-lg border">
          {queue.map((item, index) => {
            const name = item.product
              ? localized(item.product, "name", locale)
              : "";
            return (
              <li
                className="flex items-center gap-2 p-3 text-sm"
                key={item.product_id}
              >
                <span className="w-6 text-muted-foreground tabular-nums">
                  {formatNumber(index + 1, locale)}
                </span>
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <Button
                  aria-label={t("up", { name })}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(item.product_id, -1)}
                  size="icon"
                  variant="ghost"
                >
                  <ArrowUpIcon />
                </Button>
                <Button
                  aria-label={t("down", { name })}
                  disabled={index === queue.length - 1 || reorder.isPending}
                  onClick={() => move(item.product_id, 1)}
                  size="icon"
                  variant="ghost"
                >
                  <ArrowDownIcon />
                </Button>
                <Button
                  aria-label={t("remove", { name })}
                  disabled={toggle.isPending}
                  onClick={() =>
                    toggle.mutate({ productId: item.product_id, saved: true })
                  }
                  size="icon"
                  variant="ghost"
                >
                  <XIcon />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
};

/** A swap already booked: when, and how to cancel or pay for it. */
const BookedSwap = ({
  swap,
}: {
  readonly swap: NonNullable<ReturnType<typeof useOpenSwap>["data"]>;
}) => {
  const t = useTranslations("app.plus.swap");
  const locale = useLocale();
  const { cancelSwap } = usePlusActions();
  const when = swap.scheduled_for
    ? t("onDate", { date: formatDate(swap.scheduled_for, locale) })
    : t("dateSoon");
  return (
    <div className="grid gap-2 rounded-md border border-plus p-4 text-sm">
      <p className="font-medium">{t("booked")}</p>
      <p>{when}</p>
      {swap.fee > 0 && swap.order_id ? (
        <Link
          className="font-medium text-pink-text hover:underline"
          href={orderPath(swap.order_id)}
        >
          {t("payExtra", { fee: formatPrice(swap.fee, locale) })}
        </Link>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={cancelSwap.isPending}
        onClick={() => cancelSwap.mutate(swap.id)}
        size="sm"
        variant="ghost"
      >
        {t("cancel")}
      </Button>
    </div>
  );
};

/** What the next home swap costs: included, or the extra fee. */
const SwapTerms = ({ firstDelivery }: { readonly firstDelivery: boolean }) => {
  const t = useTranslations("app.plus.swap");
  const locale = useLocale();
  const terms = useSwapTerms().data;
  if (!terms) {
    return null;
  }
  const left = Math.max(0, terms.homeSwaps - terms.used);
  let note = t("extra", { fee: formatPrice(terms.extraFee, locale) });
  if (firstDelivery) {
    note = t("firstFree");
  } else if (left > 0) {
    note = t("included", {
      count: left,
      n: formatNumber(left, locale),
    });
  }
  return (
    <p className="text-muted-foreground text-sm">
      {note}
      {terms.nextDate
        ? ` ${t("nextDate", { date: formatDate(terms.nextDate, locale) })}`
        : ""}
    </p>
  );
};

/**
 * Book a home swap: tick what goes back and what comes next (the queue's
 * next items are picked), on the area's delivery day.
 */
export const SwapPanel = ({ slots }: { readonly slots: number }) => {
  const t = useTranslations("app.plus.swap");
  const locale = useLocale();
  const rentals = useRentals().data ?? [];
  const queue = useQueue();
  const swap = useOpenSwap().data;
  const home = usePlusHome().data;
  const { bookSwap } = usePlusActions();
  const [returns, setReturns] = useState<string[]>([]);
  const [wants, setWants] = useState<string[] | null>(null);

  if (swap) {
    return <BookedSwap swap={swap} />;
  }

  const holding = rentals.filter(
    (rental) =>
      rental.kind === "plus" &&
      ["requested", "active", "overdue"].includes(rental.status)
  );
  const atHome = holding.filter((rental) => rental.status !== "requested");
  const heldProducts = new Set(holding.map((rental) => rental.product_id));
  const choices = queue.filter((item) => !heldProducts.has(item.product_id));
  const room = Math.max(0, slots - holding.length + returns.length);
  // Until the member picks, the top of the queue fills the free slots.
  const chosen = wants ?? choices.slice(0, room).map((item) => item.product_id);
  const tooMany = chosen.length > room;
  const nothing = chosen.length === 0 && returns.length === 0;

  const toggle = (list: string[], value: string, on: boolean) =>
    on ? [...list, value] : list.filter((item) => item !== value);

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <h3 className="font-semibold">{t("title")}</h3>
      {atHome.length > 0 ? (
        <fieldset className="grid gap-2">
          <legend className="mb-1 font-medium text-sm">{t("goesBack")}</legend>
          {atHome.map((rental) => (
            <Label
              className="flex items-center gap-2 font-normal"
              key={rental.id}
            >
              <Checkbox
                checked={returns.includes(rental.id)}
                onCheckedChange={(on) =>
                  setReturns(toggle(returns, rental.id, on === true))
                }
              />
              {localized(rental, "name", locale)}
            </Label>
          ))}
        </fieldset>
      ) : null}
      <fieldset className="grid gap-2">
        <legend className="mb-1 font-medium text-sm">
          {t("comesNext", { n: formatNumber(room, locale) })}
        </legend>
        {choices.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("queueEmpty")}</p>
        ) : null}
        {choices.map((item) => (
          <Label
            className="flex items-center gap-2 font-normal"
            key={item.product_id}
          >
            <Checkbox
              checked={chosen.includes(item.product_id)}
              onCheckedChange={(on) =>
                setWants(toggle(chosen, item.product_id, on === true))
              }
            />
            {item.product ? localized(item.product, "name", locale) : ""}
          </Label>
        ))}
      </fieldset>
      {home ? null : (
        <p className="text-muted-foreground text-sm">{t("errors.needsHome")}</p>
      )}
      <SwapTerms firstDelivery={holding.length === 0} />
      {tooMany ? (
        <p className="text-destructive text-sm" role="alert">
          {t("tooMany", { n: formatNumber(room, locale) })}
        </p>
      ) : null}
      {bookSwap.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${plusErrorKey(bookSwap.error)}`)}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={!home || nothing || tooMany || bookSwap.isPending}
        onClick={() =>
          bookSwap.mutate(
            { method: "home", returns, wants: chosen },
            {
              onSuccess: () => {
                setReturns([]);
                setWants(null);
              },
            }
          )
        }
      >
        {bookSwap.isPending ? t("booking") : t("book")}
      </Button>
    </section>
  );
};

/** Pause for up to a month a year, or end a pause early. */
const PauseControl = ({
  pausedUntil,
}: {
  readonly pausedUntil: string | null;
}) => {
  const t = useTranslations("app.plus.manage");
  const tSwap = useTranslations("app.plus.swap");
  const locale = useLocale();
  const id = useId();
  const { pause, resume } = usePlusActions();
  const [days, setDays] = useState("14");

  if (pausedUntil && new Date(pausedUntil) > new Date()) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex-1">
          {t("pausedUntil", { date: formatDate(pausedUntil, locale) })}
        </span>
        <Button
          disabled={resume.isPending}
          onClick={() => resume.mutate()}
          size="sm"
          variant="outline"
        >
          {t("resume")}
        </Button>
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-days`}>{t("pauseDays")}</Label>
          <Input
            className="w-24"
            dir="ltr"
            id={`${id}-days`}
            inputMode="numeric"
            max={31}
            min={1}
            onChange={(event) => setDays(event.target.value)}
            type="number"
            value={days}
          />
        </div>
        <Button
          disabled={pause.isPending || !Number(days)}
          onClick={() => pause.mutate(Number(days))}
          variant="outline"
        >
          {t("pause")}
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">{t("pauseHelp")}</p>
      {pause.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {tSwap(`errors.${plusErrorKey(pause.error)}`)}
        </p>
      ) : null}
    </div>
  );
};

/** Change plan (from the next renewal), pause, or cancel. */
export const ManagePlus = () => {
  const t = useTranslations("app.plus.manage");
  const locale = useLocale();
  const id = useId();
  const state = usePlusPlanState().data;
  const plans = usePlans("plus").data ?? [];
  const { cancel, changePlan } = usePlusActions();

  if (!state || state.provider === "company") {
    return null;
  }
  const next = plans.find((plan) => plan.id === state.next_plan_id);
  const end = state.current_period_end
    ? formatDate(state.current_period_end, locale)
    : "";

  return (
    <section className="grid gap-5 rounded-lg border p-4">
      <h3 className="font-semibold">{t("title")}</h3>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-plan`}>{t("changePlan")}</Label>
        <Select
          onValueChange={(plan) => changePlan.mutate(plan)}
          value={state.next_plan_id ?? state.plan_id}
        >
          <SelectTrigger className="w-full sm:w-80" id={`${id}-plan`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {t(plan.billing_interval === "year" ? "yearly" : "monthly", {
                  plan: planName(plan, locale),
                  price: formatPrice(plan.amount, locale),
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">
          {next
            ? t("changesOn", { date: end, plan: planName(next, locale) })
            : t("changeHelp")}
        </p>
      </div>
      <PauseControl pausedUntil={state.paused_until} />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex-1">
          {state.cancel_at_period_end
            ? t("endsOn", { date: end })
            : t("cancelHelp")}
        </span>
        <Button
          disabled={cancel.isPending}
          onClick={() => cancel.mutate(state.cancel_at_period_end)}
          size="sm"
          variant={state.cancel_at_period_end ? "outline" : "ghost"}
        >
          {state.cancel_at_period_end ? t("keep") : t("cancel")}
        </Button>
      </div>
    </section>
  );
};
