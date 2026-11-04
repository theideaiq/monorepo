"use client";

/**
 * The top of /plus and what it shows by who is looking: the household's
 * slots for a member, the pitch for everyone else, and the member's queue.
 * Kept apart from components/screens/plus.tsx so the catalogue page doesn't
 * carry the join, swap and plan screens (and their phone input) in its
 * first load (A28).
 */
import { useAuth } from "@repo/auth/provider";
import { localized } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { cn } from "@repo/design-system/lib/utils";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { Rail } from "@/components/shop/rail";
import { SectionSpinner } from "@/components/states";
import { CoverCard } from "@/components/store/cover-card";
import { isDuoPartner, useMyDuo } from "@/lib/duo";
import {
  isLivePlan,
  type RentalAllowance,
  usePlusAvailability,
  useRentalAllowance,
  useRentals,
} from "@/lib/plus-queries";
import { usePlusSubscription } from "@/lib/queries";
import { type QueueItem, useQueue } from "@/lib/queue-queries";

/** Whether the signed-in person has Plus (their own plan or a Duo place). */
export const usePlusMember = () => {
  const { loading, user } = useAuth();
  const subscription = usePlusSubscription();
  const duo = useMyDuo();
  const member =
    isLivePlan(subscription.data?.status) || isDuoPartner(duo.data);
  const known =
    !loading && (!user || (subscription.isFetched && duo.isFetched));
  return { known, member };
};

/**
 * /plus opens on the household's slots for a member, on the pitch for
 * everyone else; the catalogue rows (rendered on the server) follow. The
 * pitch is what the server renders and what shows until the person is
 * known to be a member: most visitors have no Plus, and an empty box that
 * grew into the pitch moved the whole page and delayed its heading (A28).
 */
export const PlusHomeSwitch = ({
  member,
  visitor,
}: {
  readonly member: ReactNode;
  readonly visitor: ReactNode;
}) => {
  const { known, member: isMember } = usePlusMember();
  return known && isMember ? member : visitor;
};

/**
 * What only those without Plus see (the three plan cards on /plus): shown
 * until the person is known to be a member, like the pitch.
 */
export const VisitorOnly = ({ children }: { readonly children: ReactNode }) => {
  const { known, member } = usePlusMember();
  return known && member ? null : children;
};

/** A slot bar: one segment per item the plan keeps at home. */
export const Slots = ({
  allowance,
}: {
  readonly allowance: RentalAllowance;
}) => (
  <div aria-hidden="true" className="flex flex-1 gap-1">
    {Array.from({ length: allowance.slots }, (_, index) => (
      <span
        className={cn(
          "h-2 flex-1 rounded-full",
          index < allowance.used ? "bg-idea-pink" : "bg-muted"
        )}
        // biome-ignore lint/suspicious/noArrayIndexKey: fixed slots
        key={index}
      />
    ))}
  </div>
);

/**
 * What needs the member first: "At home 2 of 2", what's at home, what's
 * next in the queue, and Send one back.
 */
export const HouseholdSlots = () => {
  const t = useTranslations("app.plus.home");
  const locale = useLocale();
  const allowance = useRentalAllowance().data;
  const rentals = useRentals().data ?? [];
  const queue = useQueue();
  const atHome = rentals.filter((rental) =>
    ["requested", "active", "overdue"].includes(rental.status)
  );
  const next = queue.items[0]?.product;

  if (!allowance) {
    return <SectionSpinner className="py-6" />;
  }
  return (
    <section
      aria-labelledby="household"
      className="grid gap-4 rounded-[28px] border bg-surface-raised p-5 md:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold text-xl" id="household">
          {t("atHome", {
            count: formatNumber(allowance.used, locale),
            slots: formatNumber(allowance.slots, locale),
          })}
        </h2>
        <Button asChild variant="outline">
          <Link href="/pass/at-home">{t("sendBack")}</Link>
        </Button>
      </div>
      <Slots allowance={allowance} />
      {atHome.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {atHome.map((rental) => (
            <li className="flex justify-between gap-3" key={rental.id}>
              <span className="truncate">
                {localized(rental, "name", locale)}
              </span>
              <span className="shrink-0 text-muted-foreground text-xs">
                {rental.due_at
                  ? t("due", { date: formatDate(rental.due_at, locale) })
                  : t(rental.status === "requested" ? "onTheWay" : "atHomeNow")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-sm">
        {next ? (
          <Link className="hover:underline" href="/pass/queue">
            {t("nextUp", { name: localized(next, "name", locale) })}
          </Link>
        ) : (
          <span className="text-muted-foreground">{t("queueEmpty")}</span>
        )}
      </p>
    </section>
  );
};

const QueueCover = ({ item }: { readonly item: QueueItem }) => {
  const availability = usePlusAvailability(item.product_id).data;
  return item.product ? (
    <CoverCard availability={availability} plus product={item.product} />
  ) : null;
};

/** "Your queue", in order, with availability on every cover. */
export const QueueRow = () => {
  const t = useTranslations("app.plus.home");
  const queue = useQueue();
  if (queue.items.length === 0) {
    return null;
  }
  return (
    <Rail
      action={{ href: "/pass/queue", label: t("seeQueue") }}
      title={t("yourQueue")}
    >
      {queue.items.slice(0, 8).map((item) => (
        <QueueCover item={item} key={item.product_id} />
      ))}
    </Rail>
  );
};
