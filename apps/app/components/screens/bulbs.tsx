"use client";

import { BULB_VALUE_IQD, formatPrice, planName } from "@repo/commerce";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { LightbulbIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import {
  type BulbEntry,
  useBulbEntries,
  useBulbRules,
  useMyBulbs,
} from "@/lib/bulbs-queries";

/** Bonuses with their own label, by reason ("birthday_2026" is a birthday). */
const BONUS_LABELS = {
  event_check_in: "checkIn",
  first_order: "firstOrder",
  invite: "invite",
  photo_review: "photoReview",
  telegram: "telegram",
} as const;

const entryLabelKey = (entry: BulbEntry) => {
  if (entry.kind === "purchase" && entry.payment_id) {
    return "plusPayment";
  }
  if (entry.kind === "bonus" && entry.reason) {
    if (entry.reason.startsWith("birthday_")) {
      return "birthday";
    }
    if (entry.reason in BONUS_LABELS) {
      return BONUS_LABELS[entry.reason as keyof typeof BONUS_LABELS];
    }
  }
  return entry.kind;
};

const rate = (value: number, locale: Locale) =>
  formatNumber(value, locale, { maximumFractionDigits: 2 });

/** One line of the history: what it was, when, and the Bulbs in or out. */
const EntryRow = ({ entry }: { readonly entry: BulbEntry }) => {
  const t = useTranslations("app.bulbs");
  const locale = useLocale() as Locale;
  const label = t(`kinds.${entryLabelKey(entry)}`);
  const pending =
    entry.status === "pending" && new Date(entry.available_at) > new Date();

  return (
    <li className="flex items-center gap-3 py-3">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <p className="font-medium text-sm">{label}</p>
        {entry.kind === "adjustment" && entry.reason ? (
          <p className="truncate text-muted-foreground text-xs">
            {entry.reason}
          </p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {formatDate(entry.created_at, locale)}
          {pending
            ? ` · ${t("usableFrom", { date: formatDate(entry.available_at, locale) })}`
            : null}
          {entry.status === "void" ? ` · ${t("voided")}` : null}
        </p>
      </div>
      <span
        className={cn(
          "font-semibold tabular-nums",
          entry.status === "void" && "text-muted-foreground line-through",
          entry.amount < 0 && "text-muted-foreground"
        )}
        dir="ltr"
      >
        {entry.amount > 0 ? "+" : "−"}
        {formatNumber(Math.abs(entry.amount), locale)}
      </span>
    </li>
  );
};

/**
 * Your Pass → Bulbs: what the member can spend and what's pending, the rate
 * they earn at, how everyone earns (the store's rate and each Plus plan's),
 * the rules, and the history.
 */
export const Bulbs = () => {
  const t = useTranslations("app.bulbs");
  const locale = useLocale() as Locale;
  const mine = useMyBulbs();
  const rules = useBulbRules();
  const entries = useBulbEntries();

  if (mine.isPending || rules.isPending) {
    return <SectionSpinner />;
  }
  if (mine.isError || rules.isError || !mine.data) {
    return (
      <ErrorState
        onRetry={() => {
          mine.refetch();
          rules.refetch();
        }}
      />
    );
  }

  const bulbs = mine.data;
  const earning = [
    { id: "everyone", label: t("everyone"), rate: rules.data.rate },
    ...rules.data.plans.map((plan) => ({
      id: plan.id,
      label: planName(plan, locale),
      rate: Number(plan.bulb_rate),
    })),
  ];

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} />

      <section className="grid gap-1 rounded-xl border bg-card p-5 shadow-sm">
        <p className="text-muted-foreground text-sm">{t("available")}</p>
        <p className="flex items-center gap-2 font-bold text-4xl tabular-nums">
          <LightbulbIcon aria-hidden="true" className="size-7 text-pink-text" />
          {formatNumber(bulbs.available, locale)}
        </p>
        <p className="text-muted-foreground text-sm">
          {t("worth", {
            amount: formatPrice(bulbs.available * BULB_VALUE_IQD, locale),
          })}
        </p>
        {bulbs.pending > 0 ? (
          <p className="text-sm">
            {t("pending", { bulbs: formatNumber(bulbs.pending, locale) })}
          </p>
        ) : null}
        <p className="pt-2 font-medium text-sm">
          {t("rate", { rate: rate(Number(bulbs.rate), locale) })}
        </p>
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">{t("earnTitle")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {earning.map((row) => (
            <li
              className={cn(
                "grid content-start gap-1 rounded-lg border p-4",
                row.rate === Number(bulbs.rate) &&
                  "border-primary ring-1 ring-primary"
              )}
              key={row.id}
            >
              <p className="font-semibold">{row.label}</p>
              <p className="text-sm">
                {t("cashback", { rate: rate(row.rate, locale) })}
              </p>
            </li>
          ))}
        </ul>
        <ul className="grid list-disc gap-1 ps-5 text-muted-foreground text-sm">
          <li>{t("rules.value")}</li>
          <li>{t("rules.spend")}</li>
          <li>
            {t("rules.pending", {
              days: formatNumber(rules.data.returnDays, locale),
            })}
          </li>
          <li>{t("rules.expiry")}</li>
        </ul>
      </section>

      <section className="grid gap-2">
        <h2 className="font-semibold">{t("historyTitle")}</h2>
        {entries.isPending ? <SectionSpinner /> : null}
        {entries.isError ? (
          <ErrorState onRetry={() => entries.refetch()} />
        ) : null}
        {entries.data && entries.data.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        ) : null}
        {entries.data && entries.data.length > 0 ? (
          <ul className="divide-y">
            {entries.data.map((entry) => (
              <EntryRow entry={entry} key={entry.id} />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
};
