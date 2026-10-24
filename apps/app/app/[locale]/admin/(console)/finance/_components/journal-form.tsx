"use client";

import { formatPrice } from "@repo/commerce";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { cn } from "@repo/design-system/lib/utils";
import { PlusIcon, TagsIcon, XIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import {
  FieldGrid,
  NativeSelect,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { type Scenario, scenarios } from "@/lib/admin/finance";
import { journalTotals } from "@/lib/admin/journal";
import { postJournalEntry } from "../actions";

interface Dimension {
  id: number;
  key: string;
  value: string;
}

interface Line {
  accountId: string;
  credit: string;
  debit: string;
  dimensions: Dimension[];
  id: number;
  memo: string;
  showDimensions: boolean;
}

let nextId = 0;
const newId = () => {
  nextId += 1;
  return nextId;
};
const emptyDimension = (): Dimension => ({ id: newId(), key: "", value: "" });
const emptyLine = (): Line => ({
  accountId: "",
  credit: "",
  debit: "",
  dimensions: [emptyDimension()],
  id: newId(),
  memo: "",
  showDimensions: false,
});

const filledDimensions = (dimensions: Dimension[]) =>
  dimensions.filter((item) => item.key.trim() && item.value.trim());

/** A line's dimensions as the JSON object the action reads. */
const dimensionsJson = (dimensions: Dimension[]) =>
  JSON.stringify(
    Object.fromEntries(
      filledDimensions(dimensions).map((item) => [
        item.key.trim(),
        item.value.trim(),
      ])
    )
  );

const toAmount = (value: string) => {
  const amount = Number(value.replaceAll(",", ""));
  return Number.isSafeInteger(amount) && amount > 0 ? amount : 0;
};

interface JournalFormProps {
  readonly accounts: { code: string; id: string; name: string }[];
  /** The scenario chosen in the journal list, preselected. */
  readonly scenario: Scenario;
  readonly today: string;
}

/** A new double-entry journal entry; posts only when debits equal credits. */
export const JournalForm = ({
  accounts,
  scenario,
  today,
}: JournalFormProps) => {
  const t = useTranslations("admin.finance.journal");
  const tScenario = useTranslations("admin.finance.scenarios");
  const locale = useLocale();
  const [lines, setLines] = useState<Line[]>(() => [emptyLine(), emptyLine()]);
  const [currency, setCurrency] = useState("IQD");
  const currencyCode = currency.trim().toUpperCase();
  const foreign = currencyCode !== "" && currencyCode !== "IQD";

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

  const updateDimension = (
    line: Line,
    dimensionId: number,
    change: Partial<Dimension>
  ) =>
    update(line.id, {
      dimensions: line.dimensions.map((item) =>
        item.id === dimensionId ? { ...item, ...change } : item
      ),
    });

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
          <SelectField
            defaultValue={scenario}
            hint={t("scenarioHint")}
            label={t("scenario")}
            name="scenario"
            options={scenarios.map((value) => ({
              label: tScenario(value),
              value,
            }))}
          />
          <div className="grid grid-cols-[6rem_1fr] items-start gap-2">
            <TextField
              dir="ltr"
              label={t("currency")}
              maxLength={3}
              name="currency"
              onChange={(event) => setCurrency(event.target.value)}
              value={currency}
            />
            {foreign ? (
              <TextField
                dir="ltr"
                hint={t("exchangeRateHint", { currency: currencyCode })}
                inputMode="decimal"
                label={t("exchangeRate")}
                name="exchangeRate"
                required
              />
            ) : null}
          </div>
        </FieldGrid>
        <p className="text-muted-foreground text-sm">
          {foreign
            ? t("currencyForeignHint", { currency: currencyCode })
            : t("currencyHint")}
        </p>
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
            className="grid gap-2 rounded-md border p-2 md:grid-cols-[2fr_2fr_1fr_1fr_auto] md:border-0 md:p-0"
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
              onChange={(event) =>
                update(line.id, { memo: event.target.value })
              }
              placeholder={t("memo")}
              value={line.memo}
            />
            <Input
              aria-label={t("debit")}
              dir="ltr"
              inputMode="numeric"
              name="debit[]"
              onChange={(event) =>
                update(line.id, { debit: event.target.value })
              }
              placeholder={t("debit")}
              readOnly={toAmount(line.credit) > 0}
              value={line.debit}
            />
            <Input
              aria-label={t("credit")}
              dir="ltr"
              inputMode="numeric"
              name="credit[]"
              onChange={(event) =>
                update(line.id, { credit: event.target.value })
              }
              placeholder={t("credit")}
              readOnly={toAmount(line.debit) > 0}
              value={line.credit}
            />
            <input
              name="dimensions[]"
              type="hidden"
              value={dimensionsJson(line.dimensions)}
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
            <div className="grid gap-2 md:col-span-5">
              <Button
                aria-expanded={line.showDimensions}
                className="w-fit text-muted-foreground"
                onClick={() =>
                  update(line.id, { showDimensions: !line.showDimensions })
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                <TagsIcon />
                {t("dimensionsToggle", {
                  count: String(filledDimensions(line.dimensions).length),
                })}
              </Button>
              {line.showDimensions ? (
                <div className="grid gap-2 rounded-md bg-muted/40 p-2 md:ms-6">
                  <p className="text-muted-foreground text-xs">
                    {t("dimensionsHint")}
                  </p>
                  {line.dimensions.map((item) => (
                    <div className="flex gap-2" key={item.id}>
                      <Input
                        aria-label={t("dimensionKey")}
                        dir="ltr"
                        maxLength={60}
                        onChange={(event) =>
                          updateDimension(line, item.id, {
                            key: event.target.value,
                          })
                        }
                        placeholder={t("dimensionKey")}
                        value={item.key}
                      />
                      <Input
                        aria-label={t("dimensionValue")}
                        maxLength={120}
                        onChange={(event) =>
                          updateDimension(line, item.id, {
                            value: event.target.value,
                          })
                        }
                        placeholder={t("dimensionValue")}
                        value={item.value}
                      />
                      <Button
                        aria-label={t("removeDimension")}
                        onClick={() =>
                          update(line.id, {
                            dimensions:
                              line.dimensions.length > 1
                                ? line.dimensions.filter(
                                    (other) => other.id !== item.id
                                  )
                                : [emptyDimension()],
                          })
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
                    disabled={line.dimensions.length >= 10}
                    onClick={() =>
                      update(line.id, {
                        dimensions: [...line.dimensions, emptyDimension()],
                      })
                    }
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PlusIcon />
                    {t("addDimension")}
                  </Button>
                </div>
              ) : null}
            </div>
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

        <div className="grid gap-1 rounded-md bg-muted/50 p-3 text-sm md:grid-cols-[4fr_1fr_1fr_auto] md:items-center">
          <span className="font-medium">{t("totals")}</span>
          <span className="tabular-nums">
            {formatPrice(totals.debit, locale)}
          </span>
          <span className="tabular-nums">
            {formatPrice(totals.credit, locale)}
          </span>
          <span
            className={cn(
              "font-medium",
              totals.balanced ? "text-success" : "text-destructive"
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
