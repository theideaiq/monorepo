import { formatPrice } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
} from "@repo/internationalization/format";

type DateInput = Date | string | number;

/** Display formatting for one locale (Latin digits, Baghdad time). */
export const formatters = (locale: Locale) => ({
  date: (value: DateInput | null | undefined) =>
    value ? formatDate(value, locale) : "—",
  dateTime: (value: DateInput | null | undefined) =>
    value ? formatDateTime(value, locale) : "—",
  /** IQD amounts. */
  money: (amount: number | null | undefined) =>
    amount === null || amount === undefined ? "—" : formatPrice(amount, locale),
  /** Amounts in another currency (equity rounds). */
  moneyIn: (amount: number | null | undefined, currency: string) =>
    amount === null || amount === undefined
      ? "—"
      : formatCurrency(amount, locale, currency),
  number: (value: number | null | undefined) =>
    value === null || value === undefined ? "—" : formatNumber(value, locale),
  percent: (value: number) =>
    formatNumber(value / 100, locale, {
      maximumFractionDigits: 2,
      style: "percent",
    }),
});

export type Formatters = ReturnType<typeof formatters>;
