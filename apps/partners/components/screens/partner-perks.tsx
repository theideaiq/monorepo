"use client";

import { scannedPass } from "@repo/auth/pass-code";
import { localized } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { formatNumber, intlLocale } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type CheckedCard,
  redeemError,
  useMyPartners,
  usePartnerCheck,
  usePerkStats,
  useRedeemPerk,
} from "@/lib/perk-queries";

/** The checked card: who it is, their badges and the perks to record. */
const CheckedResult = ({
  card,
  organizationId,
  scanned,
}: {
  readonly card: CheckedCard;
  readonly organizationId: string;
  readonly scanned: string;
}) => {
  const t = useTranslations("app.company.perks");
  const locale = useLocale();
  const redeem = useRedeemPerk(organizationId);
  const [done, setDone] = useState<string[]>([]);

  if (!card.valid) {
    return (
      <p className="text-destructive text-sm" role="alert">
        {t("invalidCard")}
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      <p className="flex flex-wrap items-center gap-2 font-medium">
        {card.first_name}
        <span className="text-muted-foreground text-sm tabular-nums" dir="ltr">
          № {card.member_number}
        </span>
        {card.student ? <Badge>{t("student")}</Badge> : null}
        {card.plus ? <Badge>{t("plus")}</Badge> : null}
      </p>
      <ul className="grid gap-2">
        {(card.perks ?? []).map((perk) => {
          const used = perk.used_today || done.includes(perk.id);
          let state = null as string | null;
          if (!perk.open) {
            state = t(`only.${perk.audience}`);
          } else if (used) {
            state = t("usedToday");
          }
          return (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
              key={perk.id}
            >
              <span>{localized(perk, "title", locale)}</span>
              {state ? (
                <span className="text-muted-foreground">{state}</span>
              ) : (
                <Button
                  disabled={redeem.isPending}
                  onClick={() =>
                    redeem.mutate(
                      { perk: perk.id, scanned },
                      { onSuccess: () => setDone([...done, perk.id]) }
                    )
                  }
                  size="sm"
                >
                  {t("redeem")}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {redeem.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t(`errors.${redeemError(redeem.error.message)}`)}
        </p>
      ) : null}
    </div>
  );
};

/** Scan the card (the scanner types its code) or type the number and code. */
const CheckCard = ({ organizationId }: { readonly organizationId: string }) => {
  const t = useTranslations("app.company.perks");
  const id = useId();
  const check = usePartnerCheck(organizationId);
  const [card, setCard] = useState("");
  const [code, setCode] = useState("");
  const [scanned, setScanned] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = scannedPass(card.trim(), code.trim());
    setScanned(value);
    check.mutate(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("checkTitle")}</CardTitle>
        <CardDescription>{t("checkDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-card`}>{t("card")}</Label>
            <Input
              autoComplete="off"
              className="w-64"
              dir="ltr"
              id={`${id}-card`}
              onChange={(event) => setCard(event.target.value)}
              required
              value={card}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-code`}>{t("code")}</Label>
            <Input
              autoComplete="off"
              className="w-32"
              dir="ltr"
              id={`${id}-code`}
              inputMode="numeric"
              maxLength={6}
              onChange={(event) => setCode(event.target.value)}
              value={code}
            />
          </div>
          <Button disabled={check.isPending || !card} type="submit">
            {t("check")}
          </Button>
        </form>
        {check.isError ? <ErrorState onRetry={() => check.reset()} /> : null}
        {check.data ? (
          <CheckedResult
            card={check.data}
            key={scanned}
            organizationId={organizationId}
            scanned={scanned}
          />
        ) : null}
      </CardContent>
    </Card>
  );
};

/** Uses of each perk by month, for the partner. */
const Stats = ({ organizationId }: { readonly organizationId: string }) => {
  const t = useTranslations("app.company.perks");
  const locale = useLocale();
  const stats = usePerkStats(organizationId);
  if (stats.isPending) {
    return <SectionSpinner />;
  }
  if (stats.isError) {
    return <ErrorState onRetry={() => stats.refetch()} />;
  }
  const title = new Map(
    stats.data.perks.map((perk) => [perk.id, localized(perk, "title", locale)])
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("statsTitle")}</CardTitle>
        <CardDescription>{t("statsDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        {stats.data.stats.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noUses")}</p>
        ) : (
          <ul className="grid gap-1 text-sm">
            {stats.data.stats.map((row) => (
              <li
                className="flex justify-between gap-3"
                key={`${row.perk_id}-${row.month}`}
              >
                <span>
                  {new Intl.DateTimeFormat(intlLocale(locale), {
                    month: "long",
                    timeZone: "Asia/Baghdad",
                    year: "numeric",
                  }).format(new Date(`${row.month}T12:00:00`))}
                  {" · "}
                  {title.get(row.perk_id) ?? ""}
                </span>
                <span className="tabular-nums">
                  {t("uses", {
                    people: formatNumber(row.people, locale),
                    uses: formatNumber(row.uses, locale),
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const PerksForPartner = () => {
  const t = useTranslations("app.company.perks");
  const { active } = useActiveOrganization();
  const partners = useMyPartners();
  if (partners.isPending) {
    return <SectionSpinner />;
  }
  if (!partners.data?.some((row) => row.organization_id === active.id)) {
    return <p className="text-muted-foreground">{t("notPartner")}</p>;
  }
  return (
    <div className="grid gap-6">
      <CheckCard organizationId={active.id} />
      <Stats organizationId={active.id} />
    </div>
  );
};

/**
 * Partners → Perks, for partners: check a The IDEA Pass card at
 * the counter, record the perk (once a day per person) and see the monthly
 * counts.
 */
export const PartnerPerks = () => (
  <BusinessShell feature="perks">
    <PerksForPartner />
  </BusinessShell>
);
