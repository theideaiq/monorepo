"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { formatPrice } from "@repo/commerce";
import { PlusIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm, FormError, SubmitButton } from "@/components/action-form";
import { FieldGrid, NativeSelect, TextField } from "@/components/fields";
import { Panel } from "@/components/page";
import { journalTotals } from "@/lib/journal";
import { postJournalEntry } from "../actions";

interface Line {
  accountId: string;
  credit: string;
  debit: string;
  id: number;
  memo: string;
}

let nextId = 0;
const emptyLine = (): Line => {
  nextId += 1;
  return { accountId: "", credit: "", debit: "", id: nextId, memo: "" };
};

const toAmount = (value: string) => {
  const amount = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
};

interface JournalFormProps {
  readonly accounts: { code: string; id: string; name: string }[];
  readonly today: string;
}

/** A new double-entry journal entry; posts only when debits equal credits. */
export const JournalForm = ({ accounts, today }: JournalFormProps) => {
  const t = useTranslations("admin.finance.journal");
  const locale = useLocale();
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(), emptyLine()]);

  const totals = journalTotals(
    lines.map((line) => ({
      accountId: line.accountId,
      credit: toAmount(line.credit),
      debit: toAmount(line.debit),
    }))
  );

  const update = (id: number, change: Partial<Line>) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...change } : line))
    );

  const options = [
    { label: t("chooseAccount"), value: "" },
    ...accounts.map((account) => ({
      label: `${account.code} · ${account.name}`,
      value: account.id,
    })),
  ];

  return (
    <ActionForm action={postJournalEntry}>
      <Panel>
        <FieldGrid columns={3}>
          <TextField
            defaultValue={today}
            label={t("date")}
            name="entryDate"
            required
            type="date"
          />
          <TextField
            label={t("description")}
            maxLength={500}
            name="description"
            required
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            hint={t("referenceHint")}
            label={t("reference")}
            maxLength={255}
            name="reference"
          />
        </FieldGrid>
      </Panel>

      <Panel title={t("lines")}>
        <div className="hidden gap-2 px-1 text-muted-foreground text-xs md:grid md:grid-cols-[2fr_2fr_1fr_1fr_auto]">
          <span>{t("account")}</span>
          <span>{t("memo")}</span>
          <span>{t("debit")}</span>
          <span>{t("credit")}</span>
          <span className="w-9" />
        </div>
        {lines.map((line) => (
          <div
            className="grid gap-2 rounded-lg border p-2 md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:border-0 md:p-0"
            key={line.id}
          >
            <NativeSelect
              aria-label={t("account")}
              name="accountId[]"
              onChange={(event) =>
                update(line.id, { accountId: event.target.value })
              }
              options={options}
              value={line.accountId}
            />
            <Input
              aria-label={t("memo")}
              maxLength={300}
              name="memo[]"
              onChange={(event) => update(line.id, { memo: event.target.value })}
              placeholder={t("memo")}
              value={line.memo}
            />
            <Input
              aria-label={t("debit")}
              dir="ltr"
              readOnly={toAmount(line.credit) > 0}
              inputMode="numeric"
              name="debit[]"
              onChange={(event) =>
                update(line.id, { debit: event.target.value })
              }
              placeholder={t("debit")}
              value={line.debit}
            />
            <Input
              aria-label={t("credit")}
              dir="ltr"
              readOnly={toAmount(line.debit) > 0}
              inputMode="numeric"
              name="credit[]"
              onChange={(event) =>
                update(line.id, { credit: event.target.value })
              }
              placeholder={t("credit")}
              value={line.credit}
            />
            <Button
              aria-label={t("removeLine")}
              disabled={lines.length <= 2}
              onClick={() =>
                setLines((current) =>
                  current.filter((other) => other.id !== line.id)
                )
              }
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </div>
        ))}
        <Button
          className="w-fit"
          onClick={() => setLines((current) => [...current, emptyLine()])}
          size="sm"
          type="button"
          variant="outline"
        >
          <PlusIcon />
          {t("addLine")}
        </Button>

        <div className="grid gap-1 rounded-lg bg-muted/50 p-3 text-sm md:grid-cols-[4fr_1fr_1fr_auto] md:items-center">
          <span className="font-medium">{t("totals")}</span>
          <span className="tabular-nums">{formatPrice(totals.debit, locale)}</span>
          <span className="tabular-nums">
            {formatPrice(totals.credit, locale)}
          </span>
          <span
            className={cn(
              "font-medium",
              totals.balanced ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {totals.balanced
              ? t("balanced")
              : t("difference", {
                  amount: formatPrice(Math.abs(totals.difference), locale),
                })}
          </span>
        </div>
      </Panel>

      <FormError />
      <div className="flex justify-end">
        <SubmitButton disabled={!totals.balanced}>{t("post")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
