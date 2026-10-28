"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { DownloadIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField, TextField } from "@/components/admin/fields";
import { markPayoutPaid, preparePayouts } from "../actions";

/** Prepares the batch: what each shop is owed up to a day. */
export const PrepareForm = ({ today }: { readonly today: string }) => {
  const t = useTranslations("admin.finance.payouts");
  return (
    <ActionForm
      action={preparePayouts}
      className="flex flex-wrap items-end gap-3"
    >
      <TextField
        defaultValue={today}
        label={t("periodEnd")}
        max={today}
        name="periodEnd"
        required
        type="date"
        wrapperClassName="w-48"
      />
      <SubmitButton>{t("prepare")}</SubmitButton>
    </ActionForm>
  );
};

const METHODS = ["bank", "zaincash", "qi"] as const;

/** The transfer was sent: how, and its reference. */
export const PaidForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.finance.payouts");
  return (
    <ActionForm
      action={markPayoutPaid}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      <SelectField
        label={t("method")}
        name="method"
        options={METHODS.map((value) => ({
          label: t(`methods.${value}`),
          value,
        }))}
        wrapperClassName="w-36"
      />
      <TextField
        label={t("reference")}
        name="reference"
        required
        wrapperClassName="min-w-48 flex-1"
      />
      <SubmitButton size="sm">{t("markPaid")}</SubmitButton>
    </ActionForm>
  );
};

export interface CsvRow {
  account: string;
  amount: number;
  bank: string;
  iban: string;
  number: number;
  shop: string;
}

const NEEDS_QUOTES = /[",\n]/;

const csvCell = (value: string | number) => {
  const text = String(value);
  return NEEDS_QUOTES.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

/** The pending batch as a spreadsheet, for the bank or wallet transfers. */
export const CsvButton = ({
  periodEnd,
  rows,
}: {
  readonly periodEnd: string;
  readonly rows: readonly CsvRow[];
}) => {
  const t = useTranslations("admin.finance.payouts");
  const download = () => {
    const header = [
      "payout",
      "shop",
      "amount_iqd",
      "bank",
      "account_name",
      "iban",
    ];
    const lines = rows.map((row) =>
      [row.number, row.shop, row.amount, row.bank, row.account, row.iban]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([`${[header.join(","), ...lines].join("\n")}\n`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `payouts-${periodEnd}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <Button disabled={rows.length === 0} onClick={download} variant="outline">
      <DownloadIcon />
      {t("download")}
    </Button>
  );
};
