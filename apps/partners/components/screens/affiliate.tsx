"use client";

import { formatPrice } from "@repo/commerce";
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
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { type Locale, localePath } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { CopyIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { BusinessShell } from "@/components/business/business-shell";
import { useActiveOrganization } from "@/components/organization-provider";
import { ErrorState, SectionSpinner } from "@/components/states";
import { env } from "@/env";
import {
  type Affiliate,
  type AffiliateApplication,
  type AffiliateCommission,
  type AffiliatePayout,
  type AffiliateRate,
  affiliateBalance,
  MINIMUM_PAYOUT,
  PAYOUT_METHODS,
  type PayoutMethod,
  useAffiliate,
  useApplyAffiliate,
} from "@/lib/affiliate-queries";

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs";

const Field = ({
  children,
  hint,
  id,
  label,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
  readonly id: string;
  readonly label: string;
}) => (
  <div className="grid content-start gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
  </div>
);

/** The application form, or (once approved) the payout details alone. */
const ApplyForm = ({
  affiliate,
  payoutOnly = false,
}: {
  readonly affiliate: Affiliate | null;
  readonly payoutOnly?: boolean;
}) => {
  const t = useTranslations("app.affiliate.apply");
  const tMethods = useTranslations("app.affiliate.methods");
  const tCommon = useTranslations("common");
  const id = useId();
  const { active } = useActiveOrganization();
  const apply = useApplyAffiliate(active.id);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<AffiliateApplication>({
    channel: affiliate?.channel ?? "",
    payoutAccount: affiliate?.payout_account ?? "",
    payoutMethod: (affiliate?.payout_method as PayoutMethod | null) ?? "",
    pitch: affiliate?.pitch ?? "",
  });
  const set = <K extends keyof AffiliateApplication>(
    key: K,
    value: AffiliateApplication[K]
  ) => setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaved(false);
    apply.mutate(form, { onSuccess: () => setSaved(true) });
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      {payoutOnly ? null : (
        <>
          <Field hint={t("pitchHint")} id={`${id}-pitch`} label={t("pitch")}>
            <Textarea
              id={`${id}-pitch`}
              maxLength={1000}
              minLength={10}
              onChange={(event) => set("pitch", event.target.value)}
              required
              value={form.pitch}
            />
          </Field>
          <Field
            hint={t("channelHint")}
            id={`${id}-channel`}
            label={t("channel")}
          >
            <Input
              id={`${id}-channel`}
              maxLength={300}
              onChange={(event) => set("channel", event.target.value)}
              value={form.channel}
            />
          </Field>
        </>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={`${id}-method`} label={t("payoutMethod")}>
          <select
            className={selectClassName}
            id={`${id}-method`}
            onChange={(event) =>
              set("payoutMethod", event.target.value as PayoutMethod | "")
            }
            value={form.payoutMethod}
          >
            <option value="">{t("payoutLater")}</option>
            {PAYOUT_METHODS.map((method) => (
              <option key={method} value={method}>
                {tMethods(method)}
              </option>
            ))}
          </select>
        </Field>
        <Field
          hint={t("payoutAccountHint")}
          id={`${id}-account`}
          label={t("payoutAccount")}
        >
          <Input
            dir="ltr"
            id={`${id}-account`}
            maxLength={120}
            onChange={(event) => set("payoutAccount", event.target.value)}
            value={form.payoutAccount}
          />
        </Field>
      </div>
      {apply.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("failed")}
        </p>
      ) : null}
      {saved ? (
        <p className="text-muted-foreground text-sm" role="status">
          {tCommon("saved")}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={apply.isPending}
        type="submit"
      >
        {payoutOnly ? tCommon("save") : t("submit")}
      </Button>
    </form>
  );
};

const CodeCard = ({ code }: { readonly code: string }) => {
  const t = useTranslations("app.affiliate.code");
  const locale = useLocale() as Locale;
  const [copied, setCopied] = useState(false);
  const link = `${env.NEXT_PUBLIC_WEB_URL}${localePath(locale, `/a/${code}`)}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm">
        <p className="font-mono font-semibold text-2xl" dir="ltr">
          {code}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="break-all text-muted-foreground" dir="ltr">
            {link}
          </span>
          <Button onClick={copy} size="sm" variant="outline">
            <CopyIcon />
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const Earnings = ({
  commissions,
  payouts,
  rates,
}: {
  readonly commissions: readonly AffiliateCommission[];
  readonly payouts: readonly AffiliatePayout[];
  readonly rates: readonly AffiliateRate[];
}) => {
  const t = useTranslations("app.affiliate.earnings");
  const tFamilies = useTranslations("app.affiliate.families");
  const tMethods = useTranslations("app.affiliate.methods");
  const locale = useLocale() as Locale;
  const { payable, waiting } = affiliateBalance(commissions);
  const price = (amount: number) => formatPrice(amount, locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description", { minimum: price(MINIMUM_PAYOUT) })}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 text-sm">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">{t("payable")}</dt>
            <dd className="font-semibold text-lg">{price(payable)}</dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground">{t("waiting")}</dt>
            <dd className="font-semibold text-lg">{price(waiting)}</dd>
          </div>
        </dl>

        <section className="grid gap-2">
          <h3 className="font-medium">{t("rates")}</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {rates.map((rate) => (
              <li className="flex justify-between gap-2" key={rate.family}>
                <span>
                  {tFamilies.has(rate.family as "music")
                    ? tFamilies(rate.family as "music")
                    : rate.family}
                </span>
                <span dir="ltr">
                  {formatNumber(Number(rate.rate), locale)}%
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-2">
          <h3 className="font-medium">{t("commissions")}</h3>
          {commissions.length === 0 ? (
            <p className="text-muted-foreground">{t("noCommissions")}</p>
          ) : (
            <ul className="grid gap-1">
              {commissions.map((commission) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-2"
                  key={commission.id}
                >
                  <span>{formatDate(commission.created_at, locale)}</span>
                  <span className="flex items-center gap-2">
                    {price(commission.amount)}
                    <Badge variant="outline">
                      {t(`status.${commission.status}`)}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="grid gap-2">
          <h3 className="font-medium">{t("payouts")}</h3>
          {payouts.length === 0 ? (
            <p className="text-muted-foreground">{t("noPayouts")}</p>
          ) : (
            <ul className="grid gap-1">
              {payouts.map((payout) => (
                <li
                  className="flex flex-wrap justify-between gap-2"
                  key={payout.id}
                >
                  <span>
                    {formatDate(payout.created_at, locale)} ·{" "}
                    {tMethods(payout.method as PayoutMethod)}
                  </span>
                  <span>{price(payout.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
};

const AffiliateBody = () => {
  const t = useTranslations("app.affiliate");
  const { active, canManage } = useActiveOrganization();
  const query = useAffiliate(active.id);

  if (query.isPending) {
    return <SectionSpinner />;
  }
  if (query.isError) {
    return <ErrorState onRetry={() => query.refetch()} />;
  }
  const { affiliate, commissions, payouts, rates } = query.data;
  const status = affiliate?.status ?? null;

  if (status === "approved" || status === "suspended") {
    return (
      <div className="grid gap-6">
        {status === "suspended" ? (
          <p className="rounded-md border p-3 text-sm" role="status">
            {t("suspended")}
          </p>
        ) : null}
        {affiliate?.code && status === "approved" ? (
          <CodeCard code={affiliate.code} />
        ) : null}
        <Earnings commissions={commissions} payouts={payouts} rates={rates} />
        {canManage ? (
          <Card>
            <CardHeader>
              <CardTitle>{t("payout.title")}</CardTitle>
              <CardDescription>{t("payout.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ApplyForm affiliate={affiliate} payoutOnly />
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("apply.title")}</CardTitle>
        <CardDescription>{t("apply.description")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {status === "applied" ? (
          <p className="rounded-md border p-3 text-sm" role="status">
            {t("applied")}
          </p>
        ) : null}
        {status === "rejected" ? (
          <p className="rounded-md border p-3 text-sm" role="status">
            {affiliate?.staff_note
              ? t("rejectedWithNote", { note: affiliate.staff_note })
              : t("rejected")}
          </p>
        ) : null}
        {canManage ? (
          <ApplyForm affiliate={affiliate} />
        ) : (
          <p className="text-muted-foreground text-sm">{t("managersOnly")}</p>
        )}
      </CardContent>
    </Card>
  );
};

/** Partners → Affiliate. */
export const AffiliateScreen = () => (
  <BusinessShell feature="affiliate">
    <AffiliateBody />
  </BusinessShell>
);
