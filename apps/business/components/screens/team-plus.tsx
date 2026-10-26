"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { formatCurrency, formatDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { useMembers } from "@/lib/business-queries";
import { usePlans } from "@/lib/queries";
import {
  useEndPlusSeat,
  usePlusSeats,
  useRequestPlusSeat,
} from "@/lib/team-plus-queries";

const OPEN = new Set(["requested", "active"]);

/** Owners and admins: The IDEA Plus for a member, on a monthly plan. */
const RequestSeat = ({ taken }: { readonly taken: ReadonlySet<string> }) => {
  const t = useTranslations("app.suite.plus");
  const id = useId();
  const locale = useLocale();
  const { active } = useActiveOrganization();
  const members = useMembers(active.id);
  const plans = usePlans("plus");
  const request = useRequestPlusSeat(active.id);
  const [member, setMember] = useState("");
  const [plan, setPlan] = useState("");
  const monthly = (plans.data ?? []).filter(
    (row) => row.billing_interval === "month"
  );
  const available = (members.data ?? []).filter(
    (row) => !taken.has(row.userId)
  );

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (member && plan) {
      request.mutate(
        { member, plan },
        {
          onSuccess: () => {
            setMember("");
            setPlan("");
          },
        }
      );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("request.title")}</CardTitle>
        <CardDescription>{t("request.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={submit}
        >
          <div className="grid gap-2">
            <Label htmlFor={`${id}-member`}>{t("request.member")}</Label>
            <Select onValueChange={setMember} value={member}>
              <SelectTrigger id={`${id}-member`}>
                <SelectValue placeholder={t("request.choose")} />
              </SelectTrigger>
              <SelectContent>
                {available.map((row) => (
                  <SelectItem key={row.userId} value={row.userId}>
                    {row.fullName ?? t("unnamed")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-plan`}>{t("request.plan")}</Label>
            <Select onValueChange={setPlan} value={plan}>
              <SelectTrigger id={`${id}-plan`}>
                <SelectValue placeholder={t("request.choose")} />
              </SelectTrigger>
              <SelectContent>
                {monthly.map((row) => (
                  <SelectItem key={row.id} value={row.id}>
                    {t("request.planOption", {
                      plan: row.name,
                      price: formatCurrency(row.amount, locale, row.currency),
                    })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={request.isPending || !member || !plan}
            type="submit"
          >
            {t("request.send")}
          </Button>
        </form>
        {request.isError ? (
          <p className="mt-3 text-destructive text-sm" role="alert">
            {t("request.error")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
};

type Seat = NonNullable<ReturnType<typeof usePlusSeats>["data"]>[number];

/** One seat: the member, the plan and price, until when, and End. */
const SeatRow = ({
  canEnd,
  ending,
  name,
  onEnd,
  seat,
}: {
  readonly canEnd: boolean;
  readonly ending: boolean;
  readonly name: string | null;
  readonly onEnd: () => void;
  readonly seat: Seat;
}) => {
  const t = useTranslations("app.suite.plus");
  const locale = useLocale();
  const until = seat.subscriptions?.current_period_end;
  const details = [
    seat.plans
      ? t("planLine", {
          plan: seat.plans.name,
          price: formatCurrency(seat.plans.amount, locale),
        })
      : null,
    seat.status === "active" && until
      ? t("renews", { date: formatDate(until, locale) })
      : null,
    seat.status === "ended" && until
      ? t("until", { date: formatDate(until, locale) })
      : null,
  ].filter(Boolean);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <div className="grid gap-0.5">
        <span className="font-medium">{name ?? t("unnamed")}</span>
        <span className="text-muted-foreground text-xs">
          {details.join(" · ")}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={seat.status === "active" ? "default" : "outline"}>
          {t(`status.${seat.status}`)}
        </Badge>
        {canEnd && OPEN.has(seat.status) ? (
          <Button disabled={ending} onClick={onEnd} size="sm" variant="outline">
            {seat.status === "requested" ? t("withdraw") : t("end")}
          </Button>
        ) : null}
      </div>
    </li>
  );
};

const Seats = () => {
  const t = useTranslations("app.suite.plus");
  const { active, canManage } = useActiveOrganization();
  const seats = usePlusSeats(active.id, true);
  const members = useMembers(active.id);
  const end = useEndPlusSeat(active.id);
  const names = new Map(
    (members.data ?? []).map((row) => [row.userId, row.fullName])
  );
  const taken = new Set(
    (seats.data ?? [])
      .filter((seat) => OPEN.has(seat.status))
      .map((seat) => seat.user_id)
  );

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">{t("description")}</p>
      {canManage ? (
        <RequestSeat taken={taken} />
      ) : (
        <p className="text-muted-foreground text-sm">{t("managersOnly")}</p>
      )}
      <section className="grid gap-3">
        <h2 className="font-semibold text-lg">{t("seats")}</h2>
        {seats.isPending ? <SectionSpinner /> : null}
        {seats.isError ? <ErrorState onRetry={() => seats.refetch()} /> : null}
        {seats.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : null}
        {seats.data?.length ? (
          <ul className="divide-y rounded-md border">
            {seats.data.map((seat) => (
              <SeatRow
                canEnd={canManage}
                ending={end.isPending}
                key={seat.id}
                name={names.get(seat.user_id) ?? null}
                onEnd={() => end.mutate(seat.id)}
                seat={seat}
              />
            ))}
          </ul>
        ) : null}
        {end.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("endError")}
          </p>
        ) : null}
      </section>
    </div>
  );
};

/** /business/plus: The IDEA Plus the company pays for its members. */
export const TeamPlus = () => (
  <BusinessShell>
    <Seats />
  </BusinessShell>
);
