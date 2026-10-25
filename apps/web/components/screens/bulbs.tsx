"use client";

import { BULB_VALUE_IQD, formatPrice } from "@repo/commerce";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Progress } from "@repo/design-system/components/ui/progress";
import { cn } from "@repo/design-system/lib/utils";
import type { Locale } from "@repo/internationalization";
import { formatDate, formatNumber } from "@repo/internationalization/format";
import { LightbulbIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/page-header";
import { ErrorState, SectionSpinner } from "@/components/states";
import { type BulbTier, tierPerks, tierProgress } from "@/lib/bulbs";
import {
  type BulbEntry,
  useBulbEntries,
  useBulbTiers,
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
 * My Pass → Bulbs: what the member can spend, what's pending, their tier and
 * how far the next one is, every tier's cashback and perks, and the history.
 */
export const Bulbs = () => {
  const t = useTranslations("app.bulbs");
  const tTier = useTranslations("app.bulbs.tiers");
  const locale = useLocale() as Locale;
  const mine = useMyBulbs();
  const tiers = useBulbTiers();
  const entries = useBulbEntries();

  if (mine.isPending || tiers.isPending) {
    return <SectionSpinner />;
  }
  if (mine.isError || tiers.isError || !mine.data) {
    return (
      <ErrorState
        onRetry={() => {
          mine.refetch();
          tiers.refetch();
        }}
      />
    );
  }

  const bulbs = mine.data;
  const tier = bulbs.tier as BulbTier;
  const current = tiers.data.find((row) => row.tier === tier);
  const progress = tierProgress(
    bulbs.spend,
    current?.min_spend ?? 0,
    bulbs.next_min_spend
  );

  return (
    <div className="grid gap-6">
      <PageHeader title={t("title")} />

      <section className="grid gap-4 rounded-xl border bg-card p-5 shadow-sm sm:grid-cols-2">
        <div className="grid content-start gap-1">
          <p className="text-muted-foreground text-sm">{t("available")}</p>
          <p className="flex items-center gap-2 font-bold text-4xl tabular-nums">
            <LightbulbIcon
              aria-hidden="true"
              className="size-7 text-pink-text"
            />
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
        </div>
        <div className="grid content-start gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{tTier(`${tier}.name`)}</Badge>
            <span className="text-sm">
              {t("rate", { rate: rate(Number(bulbs.rate), locale) })}
            </span>
          </div>
          <Progress aria-label={t("progressLabel")} value={progress * 100} />
          <p className="text-muted-foreground text-sm">
            {bulbs.next_tier && bulbs.next_min_spend !== null
              ? t("toNext", {
                  amount: formatPrice(
                    Math.max(0, bulbs.next_min_spend - bulbs.spend),
                    locale
                  ),
                  tier: tTier(`${bulbs.next_tier}.name`),
                })
              : t("topTier")}
          </p>
          <p className="text-muted-foreground text-xs">
            {t("spend", { amount: formatPrice(bulbs.spend, locale) })}
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="font-semibold">{t("tiersTitle")}</h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiers.data.map((row) => (
            <li
              className={cn(
                "grid content-start gap-2 rounded-lg border p-4",
                row.tier === tier && "border-primary ring-1 ring-primary"
              )}
              key={row.tier}
            >
              <p className="font-semibold">{tTier(`${row.tier}.name`)}</p>
              <p className="text-muted-foreground text-xs">
                {row.min_spend > 0
                  ? t("from", { amount: formatPrice(row.min_spend, locale) })
                  : t("everyone")}
              </p>
              <ul className="grid gap-1 text-sm">
                <li>
                  {t("cashback", { rate: rate(Number(row.rate), locale) })}
                </li>
                {row.free_delivery_from === null ? null : (
                  <li>
                    {row.free_delivery_from === 0
                      ? t("freeDelivery")
                      : t("freeDeliveryFrom", {
                          amount: formatPrice(row.free_delivery_from, locale),
                        })}
                  </li>
                )}
                {tierPerks[row.tier].map((perk) => (
                  <li key={perk}>{t(`perks.${perk}`)}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <ul className="grid list-disc gap-1 ps-5 text-muted-foreground text-sm">
          <li>{t("rules.value")}</li>
          <li>{t("rules.spend")}</li>
          <li>{t("rules.plus")}</li>
          <li>{t("rules.pending")}</li>
          <li>{t("rules.tradeIn")}</li>
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
