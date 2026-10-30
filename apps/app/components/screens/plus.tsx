"use client";

import { useAuth } from "@repo/auth/provider";
import { localized, planName } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Label } from "@repo/design-system/components/ui/label";
import { Switch } from "@repo/design-system/components/ui/switch";
import { cn } from "@repo/design-system/lib/utils";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { CheckIcon, CrownIcon, MoveRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type ReactNode, useEffect, useId, useState } from "react";
import { AgeAwareError } from "@/components/age-aware-error";
import { JoinPlus } from "@/components/plus/join-plus";
import { ManagePlus } from "@/components/plus/plus-tools";
import { Rail } from "@/components/shop/rail";
import { SignedInSection } from "@/components/signed-in-section";
import { ErrorState, SectionSpinner } from "@/components/states";
import { CoverCard } from "@/components/store/cover-card";
import {
  hasPendingCheckout,
  reportCompletedCheckout,
} from "@/lib/checkout-tracking";
import { isDuoPartner, type MyDuo, useMyDuo } from "@/lib/duo";
import { plansFor, usePlusStatus } from "@/lib/plus-launch";
import {
  isLivePlan,
  type RentalAllowance,
  usePlanCheckout,
  usePlusAvailability,
  useRentalAllowance,
  useRentals,
} from "@/lib/plus-queries";
import { usePlans, usePlusPayments, usePlusSubscription } from "@/lib/queries";
import { type QueueItem, useQueue } from "@/lib/queue-queries";
import { useMyStudent, useStudentPlans } from "@/lib/student-queries";
import { studentChoice } from "@/lib/students";
import { useCanSellDigitalGoods } from "@/lib/use-digital-checkout";

const POLL_MS = 3000;

/** Whether the signed-in person has Plus (their own plan or a Duo place). */
const usePlusMember = () => {
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
 * everyone else; the catalogue rows (rendered on the server) follow.
 */
export const PlusHomeSwitch = ({
  member,
  visitor,
}: {
  readonly member: ReactNode;
  readonly visitor: ReactNode;
}) => {
  const { known, member: isMember } = usePlusMember();
  if (!known) {
    return <div className="min-h-24" />;
  }
  return isMember ? member : visitor;
};

/** What only those without Plus see (the three plan cards on /plus). */
export const VisitorOnly = ({ children }: { readonly children: ReactNode }) => {
  const { known, member } = usePlusMember();
  return known && !member ? children : null;
};

/** A slot bar: one segment per item the plan keeps at home. */
const Slots = ({ allowance }: { readonly allowance: RentalAllowance }) => (
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

const YourPlan = ({
  allowance,
  confirming,
  duo,
}: {
  readonly allowance: RentalAllowance | undefined;
  readonly confirming: boolean;
  /** The Duo the member shares, when it's someone else's plan. */
  readonly duo?: MyDuo | null;
}) => {
  const t = useTranslations("app.plus.yourPlan");
  const tBilling = useTranslations("billing.status");
  const locale = useLocale();
  const plans = usePlans("plus");
  const subscription = usePlusSubscription(confirming ? POLL_MS : false);
  const shared = isDuoPartner(duo) ? duo : null;
  const plan = plans.data?.find(
    (item) => item.id === (shared?.planId ?? subscription.data?.plan_id)
  );
  const live = subscription.data;

  return (
    <Card className="border-2 border-idea-pink">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CrownIcon className="size-5 text-pink-text" />
          {t("title")}
        </CardTitle>
        <CardDescription>
          {live && plan ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {t("plan", { plan: planName(plan, locale) })}
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
              {live.provider === "company" ? <span>{t("company")}</span> : null}
            </span>
          ) : null}
          {!live && shared && plan ? (
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-foreground">
                {t("plan", { plan: planName(plan, locale) })}
              </span>
              <span>
                {t("sharedBy", { name: shared.holderName ?? t("holder") })}
              </span>
            </span>
          ) : null}
          {live || (shared && plan) ? null : t("none")}
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
            <Slots allowance={allowance} />
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

/** The student price: applied for verified students, else how to get it. */
const StudentNote = ({
  isStudent,
  studentPlan,
}: {
  readonly isStudent: boolean;
  readonly studentPlan: { amount: number; currency: string } | undefined;
}) => {
  const t = useTranslations("app.plus.plans");
  const locale = useLocale();
  if (!studentPlan) {
    return null;
  }
  if (isStudent) {
    return <Badge className="w-fit">{t("studentPrice")}</Badge>;
  }
  // Plain text: the card is a radio, so the way to verify sits below the
  // cards (a link inside a radio is a nested control).
  return (
    <span className="text-pink-text text-xs">
      {t("studentOffer", {
        price: formatCurrency(studentPlan.amount, locale, studentPlan.currency),
      })}
    </span>
  );
};

/** What joining needs before paying: the area check, or signing in. */
const JoinStep = ({
  busy,
  onJoin,
  primary,
}: {
  readonly busy: boolean;
  readonly onJoin: () => void;
  readonly primary: string;
}) => {
  const t = useTranslations("app.plus.sheet");
  const tBilling = useTranslations("billing");
  const { loading, user } = useAuth();
  const status = usePlusStatus();
  const canSell = useCanSellDigitalGoods();
  const { member } = usePlusMember();

  if (loading || status.isPending) {
    return <SectionSpinner className="py-4" />;
  }
  if (!user) {
    return (
      <Button asChild className="w-full" size="lg">
        <Link
          href={{ pathname: "/sign-in", query: { return_to: "/plus/plans" } }}
        >
          {t("signIn")}
        </Link>
      </Button>
    );
  }
  if (member) {
    return (
      <p className="flex flex-wrap items-center gap-2 text-sm">
        {t("member")}
        <Link
          className="font-medium text-pink-text hover:underline"
          href="/plus/plan"
        >
          {t("yourPlan")}
        </Link>
      </p>
    );
  }
  if (canSell === false) {
    return (
      <p className="rounded-md bg-muted p-4 text-sm">{tBilling("webOnly")}</p>
    );
  }
  return (
    <div className="grid gap-4">
      {/* The area check (and the waitlist) before paying. */}
      <JoinPlus />
      <Button
        className="w-full"
        disabled={!status.data?.canJoin || busy || canSell !== true}
        onClick={onJoin}
        size="lg"
      >
        {busy ? t("redirecting") : `${primary}`}
      </Button>
    </div>
  );
};

/**
 * `/plus/plans`: Monthly or Yearly; Glow · Shine · Blaze; the Family switch
 * (the Duo plans: a second Pass and kids' profiles, sharing the slots);
 * the student price applied for verified students (a link to verify for
 * others); the area check; then one button, "Join Shine · 22,750 a
 * month". When the area isn't served or Plus is full, the waitlist.
 */
export const PlanSheet = () => {
  const t = useTranslations("app.plus.sheet");
  const tPlans = useTranslations("app.plus.plans");
  const locale = useLocale();
  const id = useId();
  const plans = usePlans("plus");
  const checkout = usePlanCheckout("/plus/plan");
  const studentPlans = useStudentPlans();
  const isStudent = useMyStudent().data?.verified ?? false;
  const [billing, setBilling] = useState<"month" | "year">("month");
  const [family, setFamily] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const hasFamily = plans.data?.some((plan) => plan.duo) ?? false;
  const shown = plansFor(plans.data ?? undefined, billing, family);
  // Shine (the middle plan) until another is chosen.
  const tierOf = (planId: string | null) =>
    plans.data?.find((plan) => plan.id === planId)?.tier;
  const picked =
    shown.find((plan) => plan.id === chosen) ??
    shown.find((plan) => plan.tier === tierOf(chosen)) ??
    shown[Math.min(1, shown.length - 1)];
  const choice = picked
    ? studentChoice(picked, studentPlans.data, isStudent)
    : null;
  const per = t(billing === "year" ? "perYear" : "perMonth");

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <fieldset className="flex gap-1 rounded-full border p-1">
          <legend className="sr-only">{tPlans("interval")}</legend>
          {(["month", "year"] as const).map((value) => (
            <Button
              aria-pressed={billing === value}
              className="rounded-full"
              key={value}
              onClick={() => setBilling(value)}
              size="sm"
              type="button"
              variant={billing === value ? "secondary" : "ghost"}
            >
              {t(value === "year" ? "yearly" : "monthly")}
            </Button>
          ))}
        </fieldset>
        {hasFamily ? (
          <div className="flex items-center gap-3">
            <Switch
              checked={family}
              id={`${id}-family`}
              onCheckedChange={setFamily}
            />
            <Label htmlFor={`${id}-family`}>{t("family")}</Label>
          </div>
        ) : null}
      </div>
      <p className="text-muted-foreground text-sm">
        {family ? t("familyHint") : t("yearlyHint")}
      </p>
      {plans.isPending ? <SectionSpinner /> : null}
      {plans.isError ? <ErrorState onRetry={() => plans.refetch()} /> : null}
      {plans.data?.length === 0 ? (
        <p className="text-muted-foreground">{tPlans("empty")}</p>
      ) : null}
      <div
        aria-label={t("choose")}
        className="grid gap-4 md:grid-cols-3"
        role="radiogroup"
      >
        {shown.map((listed) => {
          const { plan, studentPlan } = studentChoice(
            listed,
            studentPlans.data,
            isStudent
          );
          const selected = listed.id === picked?.id;
          const features =
            locale === "en" ? plan.features_en : plan.features_ar;
          return (
            // biome-ignore lint/a11y/useSemanticElements: a plan card with its features, not a bare input
            <div
              aria-checked={selected}
              className={cn(
                "grid cursor-pointer content-start gap-3 rounded-[28px] border-2 bg-card p-5 outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-idea-pink" : "border-border"
              )}
              key={listed.id}
              onClick={() => setChosen(listed.id)}
              onKeyDown={(event) => {
                if (event.key === " " || event.key === "Enter") {
                  event.preventDefault();
                  setChosen(listed.id);
                }
              }}
              role="radio"
              tabIndex={0}
            >
              <span className="font-bold text-lg text-pink-text">
                {planName(listed, locale)}
                {listed.rental_slots
                  ? ` · ${t("items", {
                      count: listed.rental_slots,
                      n: formatNumber(listed.rental_slots, locale),
                    })}`
                  : ""}
              </span>
              <span>
                <span className="font-bold font-mono text-2xl">
                  {formatCurrency(plan.amount, locale, plan.currency)}
                </span>{" "}
                <span className="text-muted-foreground text-sm">{per}</span>
              </span>
              <StudentNote isStudent={isStudent} studentPlan={studentPlan} />
              {features.length ? (
                <ul className="grid gap-1.5 text-sm">
                  {features.map((feature) => (
                    <li className="flex gap-2" key={feature}>
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-pink-text" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
      {!isStudent && studentPlans.data?.length ? (
        <Link
          className="inline-flex min-h-11 items-center self-start text-pink-text text-sm hover:underline"
          href="/verify?kind=student"
        >
          {tPlans("studentVerify")}
        </Link>
      ) : null}
      {choice ? (
        <div className="grid max-w-xl gap-3">
          <JoinStep
            busy={checkout.isPending}
            onJoin={() => checkout.mutate(choice.plan)}
            primary={t("join", {
              per,
              plan: planName(picked ?? choice.plan, locale),
              price: formatCurrency(
                choice.plan.amount,
                locale,
                choice.plan.currency
              ),
            })}
          />
          {checkout.isError ? (
            <AgeAwareError error={checkout.error} fallback={tPlans("failed")} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
};

/** Links to the Plus pages of the Pass: at home, the queue, the history. */
const PassLinks = () => {
  const t = useTranslations("app.plus.planPage");
  const links = [
    { href: "/pass/at-home", label: t("atHome") },
    { href: "/pass/queue", label: t("queue") },
    { href: "/pass/history", label: t("history") },
  ];
  return (
    <ul className="grid gap-2 sm:grid-cols-3">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            className="flex min-h-11 items-center justify-between gap-2 rounded-lg border p-3 text-sm hover:bg-muted"
            href={link.href}
          >
            {link.label}
            <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </li>
      ))}
    </ul>
  );
};

const PlanPageMember = () => {
  const t = useTranslations("app.plus.planPage");
  const [confirming, setConfirming] = useState(hasPendingCheckout);
  const subscription = usePlusSubscription();
  const allowance = useRentalAllowance();
  const payments = usePlusPayments(confirming ? POLL_MS : false);
  const duo = useMyDuo().data;
  const partner = isDuoPartner(duo);
  const member = isLivePlan(subscription.data?.status) || partner;
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
    <div className="flex flex-col gap-6">
      <YourPlan allowance={allowance.data} confirming={confirming} duo={duo} />
      {member || confirming || duo ? null : (
        <Button asChild className="self-start" size="lg">
          <Link href="/plus/plans">{t("choose")}</Link>
        </Button>
      )}
      {member ? <PassLinks /> : null}
      {member && !partner ? <ManagePlus /> : null}
      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold text-lg">{t("family")}</h2>
          <Link
            className="inline-flex min-h-11 items-center gap-1 font-medium text-pink-text text-sm hover:underline"
            href="/pass/family"
          >
            {t("familyLink")}
            <MoveRight aria-hidden="true" className="size-4 rtl:rotate-180" />
          </Link>
        </div>
      </section>
    </div>
  );
};

/** `/plus/plan`: your plan, change plan, pause, cancel, and Family. */
export const PlanPage = () => {
  const t = useTranslations("app.plus");
  return (
    <SignedInSection
      id="plan"
      returnTo="/plus/plan"
      signedOut={t("signedOut")}
      signIn={t("signIn")}
      title={t("planPage.title")}
    >
      <PlanPageMember />
    </SignedInSection>
  );
};
