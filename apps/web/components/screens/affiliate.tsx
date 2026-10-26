"use client";

import { formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { InviteCard } from "@/components/invite-card";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  AFFILIATE_MIN_PAYOUT,
  type Commission,
  commissionState,
  type Payout,
  type PayoutMethod,
  payoutMethods,
  useApplyAffiliate,
  useMyAffiliate,
  useSetPayout,
} from "@/lib/affiliates";

type Mine = NonNullable<ReturnType<typeof useMyAffiliate>["data"]>;

/** The application: where the member will share their link. */
const ApplyForm = ({
  channel: savedChannel = "",
  pitch: savedPitch = "",
}: {
  readonly channel?: string | null;
  readonly pitch?: string | null;
}) => {
  const t = useTranslations("app.affiliate");
  const id = useId();
  const apply = useApplyAffiliate();
  const [pitch, setPitch] = useState(savedPitch ?? "");
  const [channel, setChannel] = useState(savedChannel ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pitch.trim()) {
      apply.mutate({ channel, pitch });
    }
  };

  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm"
      onSubmit={submit}
    >
      <h2 className="font-semibold">{t("apply.title")}</h2>
      <p className="text-muted-foreground text-sm">{t("apply.terms")}</p>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-pitch`}>{t("apply.pitch")}</Label>
        <Textarea
          className="min-h-24"
          id={`${id}-pitch`}
          maxLength={1000}
          onChange={(event) => setPitch(event.target.value)}
          placeholder={t("apply.pitchPlaceholder")}
          required
          value={pitch}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${id}-channel`}>{t("apply.channel")}</Label>
        <Input
          dir="ltr"
          id={`${id}-channel`}
          maxLength={300}
          onChange={(event) => setChannel(event.target.value)}
          placeholder={t("apply.channelPlaceholder")}
          value={channel}
        />
      </div>
      {apply.isError ? (
        <p className="text-destructive text-sm" role="alert">
          {t("apply.failed")}
        </p>
      ) : null}
      <Button className="justify-self-start" disabled={apply.isPending}>
        {t("apply.submit")}
      </Button>
    </form>
  );
};

/** The affiliate's link and code, to copy or share. */
const LinkCard = ({ code }: { readonly code: string }) => {
  const t = useTranslations("app.affiliate");
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/r/${code}`;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  const share = async () => {
    try {
      await navigator.share({ text: t("shareText", { code }), url: link });
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <section className="grid gap-3 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{t("link.title")}</h2>
      <p className="text-muted-foreground text-sm">{t("link.description")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-md bg-muted px-3 py-2 text-sm"
          dir="ltr"
        >
          {link}
        </code>
        <Button onClick={copy} size="sm" type="button" variant="outline">
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? t("link.copied") : t("link.copy")}
        </Button>
        {canShare ? (
          <Button onClick={share} size="sm" type="button">
            <Share2Icon />
            {t("link.share")}
          </Button>
        ) : null}
      </div>
      <p className="text-sm">
        {t("link.code")}{" "}
        <code className="rounded bg-muted px-2 py-0.5 font-semibold" dir="ltr">
          {code}
        </code>
      </p>
    </section>
  );
};

/** Ready to pay, in the return window and paid so far. */
const Balance = ({ mine }: { readonly mine: Mine }) => {
  const t = useTranslations("app.affiliate");
  const locale = useLocale() as Locale;
  const figures = [
    { label: t("balance.ready"), value: mine.available },
    { label: t("balance.holding"), value: mine.pending },
    { label: t("balance.paid"), value: mine.paid },
  ];
  return (
    <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm">
      <dl className="grid gap-4 sm:grid-cols-3">
        {figures.map((figure) => (
          <div className="grid gap-1" key={figure.label}>
            <dt className="text-muted-foreground text-sm">{figure.label}</dt>
            <dd className="font-bold text-2xl tabular-nums">
              {formatPrice(figure.value, locale)}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        {t("balance.summary", {
          minimum: formatPrice(AFFILIATE_MIN_PAYOUT, locale),
          orders: formatNumber(mine.orders, locale),
          plus: formatNumber(mine.plus_members, locale),
        })}
      </p>
    </section>
  );
};

/** How the affiliate wants to be paid. */
const PayoutForm = ({ mine }: { readonly mine: Mine }) => {
  const t = useTranslations("app.affiliate");
  const id = useId();
  const save = useSetPayout();
  const [method, setMethod] = useState<PayoutMethod>(mine.payout_method);
  const [account, setAccount] = useState(mine.payout_account ?? "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate({ account, method });
  };

  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm"
      onSubmit={submit}
    >
      <h2 className="font-semibold">{t("payout.title")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-method`}>{t("payout.method")}</Label>
          <Select
            onValueChange={(value) => setMethod(value as PayoutMethod)}
            value={method}
          >
            <SelectTrigger id={`${id}-method`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {payoutMethods.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`methods.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {method === "bulbs" ? (
          <p className="self-end text-muted-foreground text-sm">
            {t("payout.bulbsBonus")}
          </p>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-account`}>
              {t(method === "bank" ? "payout.iban" : "payout.wallet")}
            </Label>
            <Input
              dir="ltr"
              id={`${id}-account`}
              maxLength={120}
              onChange={(event) => setAccount(event.target.value)}
              required
              value={account}
            />
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={save.isPending}>{t("payout.save")}</Button>
        {save.isSuccess ? (
          <p className="text-muted-foreground text-sm" role="status">
            {t("payout.saved")}
          </p>
        ) : null}
        {save.isError ? (
          <p className="text-destructive text-sm" role="alert">
            {t("payout.failed")}
          </p>
        ) : null}
      </div>
    </form>
  );
};

/** One commission: what earned it, when, its state and amount. */
const CommissionRow = ({ commission }: { readonly commission: Commission }) => {
  const t = useTranslations("app.affiliate");
  const locale = useLocale() as Locale;
  const state = commissionState(commission);
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="font-medium text-sm">{t(`kinds.${commission.kind}`)}</p>
        <p className="text-muted-foreground text-xs">
          {formatDate(commission.created_at, locale)}
          {state === "holding"
            ? ` · ${t("readyFrom", { date: formatDate(commission.available_at, locale) })}`
            : null}
        </p>
      </div>
      <Badge variant={state === "void" ? "outline" : "secondary"}>
        {t(`states.${state}`)}
      </Badge>
      <span className="font-semibold tabular-nums" dir="ltr">
        {formatPrice(commission.amount, locale)}
      </span>
    </li>
  );
};

const PayoutRow = ({ payout }: { readonly payout: Payout }) => {
  const t = useTranslations("app.affiliate");
  const locale = useLocale() as Locale;
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="font-medium text-sm">{t(`methods.${payout.method}`)}</p>
        <p className="text-muted-foreground text-xs">
          {formatDate(payout.created_at, locale)}
          {payout.bulbs
            ? ` · ${t("bulbsCredited", { bulbs: formatNumber(payout.bulbs, locale) })}`
            : null}
        </p>
      </div>
      <span className="font-semibold tabular-nums" dir="ltr">
        {formatPrice(payout.amount, locale)}
      </span>
    </li>
  );
};

/** The approved affiliate's dashboard. */
const Dashboard = ({ mine }: { readonly mine: Mine }) => {
  const t = useTranslations("app.affiliate");
  return (
    <>
      {mine.code ? <LinkCard code={mine.code} /> : null}
      <Balance mine={mine} />
      <PayoutForm mine={mine} />
      <section className="grid gap-2 rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="font-semibold">{t("commissions")}</h2>
        {mine.commissions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("noCommissions")}</p>
        ) : (
          <ul className="divide-y">
            {mine.commissions.map((commission) => (
              <CommissionRow commission={commission} key={commission.id} />
            ))}
          </ul>
        )}
      </section>
      {mine.payouts.length > 0 ? (
        <section className="grid gap-2 rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">{t("payouts")}</h2>
          <ul className="divide-y">
            {mine.payouts.map((payout) => (
              <PayoutRow key={payout.id} payout={payout} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};

/** What the member sees for each stage of their application. */
const Stage = ({ mine }: { readonly mine: Mine | null }) => {
  const t = useTranslations("app.affiliate");
  if (!mine) {
    return <ApplyForm />;
  }
  if (mine.status === "approved") {
    return <Dashboard mine={mine} />;
  }
  if (mine.status === "rejected") {
    return (
      <>
        <p className="rounded-xl border bg-card p-5 text-sm">
          {t("rejected")}
          {mine.application?.staff_note
            ? ` ${mine.application.staff_note}`
            : null}
        </p>
        <ApplyForm
          channel={mine.application?.channel}
          pitch={mine.application?.pitch}
        />
      </>
    );
  }
  return (
    <p className="rounded-xl border bg-card p-5 text-sm" role="status">
      {t(mine.status === "suspended" ? "suspended" : "reviewing")}
    </p>
  );
};

/**
 * Invite & earn, under the Bulbs on Your Pass → Bulbs: invite friends, then
 * the affiliate program for creators (apply, then the link and code,
 * earnings, payout details and the commission history).
 */
export const Affiliate = () => {
  const t = useTranslations("app.affiliate");
  const mine = useMyAffiliate();

  if (mine.isPending) {
    return <SectionSpinner />;
  }
  if (mine.isError) {
    return <ErrorState onRetry={() => mine.refetch()} />;
  }

  return (
    <section className="grid scroll-mt-24 gap-6" id="invite">
      <h2 className="font-semibold text-xl">{t("title")}</h2>
      <InviteCard />
      <section className="grid gap-4">
        <h2 className="font-semibold text-lg">{t("programTitle")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
        <Stage mine={mine.data} />
      </section>
    </section>
  );
};
