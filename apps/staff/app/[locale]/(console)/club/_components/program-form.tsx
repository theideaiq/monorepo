"use client";

import type { Tables } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { PlusIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import {
  type CostLine,
  type ItineraryStep,
  MAX_COST_LINES,
  MAX_ITINERARY_STEPS,
} from "@/lib/admin/program-package";
import { saveProgram } from "../actions";

const ROWS = [0, 1, 2, 3] as const;

interface Installment {
  due_on?: string;
  percent: number;
}

interface RefundStep {
  days_before: number;
  percent: number;
}

/** The installment plan: the first share is due on acceptance, the rest dated. */
const Installments = ({ plan }: { readonly plan: Installment[] }) => {
  const t = useTranslations("admin.editorial.programs");
  return (
    <fieldset className="grid gap-3">
      <legend className="font-medium text-sm">{t("installments")}</legend>
      <p className="text-muted-foreground text-xs">{t("installmentsHint")}</p>
      {/* The first share has no date: keeps the dates in line with theirs. */}
      <input name="installmentDue[]" type="hidden" value="" />
      {ROWS.map((row) => (
        <FieldGrid key={row}>
          <TextField
            defaultValue={plan[row]?.percent ?? (row === 0 ? 100 : "")}
            inputMode="numeric"
            label={t("share", { number: String(row + 1) })}
            name="installmentPercent[]"
          />
          {row === 0 ? (
            <p className="self-end pb-2 text-muted-foreground text-sm">
              {t("firstDue")}
            </p>
          ) : (
            <TextField
              defaultValue={plan[row]?.due_on ?? ""}
              label={t("due")}
              name="installmentDue[]"
              type="date"
            />
          )}
        </FieldGrid>
      ))}
    </fieldset>
  );
};

/** Shares refunded when withdrawing at least so many days before the start. */
const RefundSchedule = ({ schedule }: { readonly schedule: RefundStep[] }) => {
  const t = useTranslations("admin.editorial.programs");
  return (
    <fieldset className="grid gap-3">
      <legend className="font-medium text-sm">{t("refunds")}</legend>
      <p className="text-muted-foreground text-xs">{t("refundsHint")}</p>
      {ROWS.map((row) => (
        <FieldGrid key={row}>
          <TextField
            defaultValue={schedule[row]?.days_before ?? ""}
            inputMode="numeric"
            label={t("daysBefore")}
            name="refundDays[]"
          />
          <TextField
            defaultValue={schedule[row]?.percent ?? ""}
            inputMode="numeric"
            label={t("refundShare")}
            name="refundPercent[]"
          />
        </FieldGrid>
      ))}
    </fieldset>
  );
};

/** Rows that can be added and removed, each with a stable key. */
const useRows = <T,>(initial: T[], blank: T) => {
  const [rows, setRows] = useState(() =>
    (initial.length > 0 ? initial : [blank]).map((value, key) => ({
      key,
      value,
    }))
  );
  const [next, setNext] = useState(rows.length);
  return {
    add: () => {
      setRows((current) => [...current, { key: next, value: blank }]);
      setNext(next + 1);
    },
    remove: (key: number) =>
      setRows((current) => current.filter((row) => row.key !== key)),
    rows,
  };
};

/** Day by day: each row a day's title and what happens, in both languages. */
const Itinerary = ({ steps }: { readonly steps: ItineraryStep[] }) => {
  const t = useTranslations("admin.editorial.programs");
  const { add, remove, rows } = useRows<Partial<ItineraryStep>>(steps, {});
  return (
    <fieldset className="grid gap-3">
      <legend className="font-medium text-sm">{t("itinerary")}</legend>
      <p className="text-muted-foreground text-xs">{t("itineraryHint")}</p>
      {rows.map(({ key, value }) => (
        <div className="grid gap-3 rounded-md border p-3" key={key}>
          <div className="flex items-end gap-3">
            <TextField
              defaultValue={value.day ?? ""}
              inputMode="numeric"
              label={t("itineraryDay")}
              name="itineraryDay[]"
              wrapperClassName="w-28"
            />
            <Button
              aria-label={t("removeItineraryDay")}
              className="ms-auto"
              onClick={() => remove(key)}
              size="icon"
              type="button"
              variant="ghost"
            >
              <XIcon />
            </Button>
          </div>
          <FieldGrid>
            <TextField
              defaultValue={value.title_ar ?? ""}
              dir="rtl"
              label={t("itineraryTitleAr")}
              maxLength={200}
              name="itineraryTitleAr[]"
            />
            <TextField
              defaultValue={value.title_en ?? ""}
              dir="ltr"
              label={t("itineraryTitleEn")}
              maxLength={200}
              name="itineraryTitleEn[]"
            />
            <TextareaField
              defaultValue={value.detail_ar ?? ""}
              dir="rtl"
              label={t("itineraryDetailAr")}
              maxLength={1000}
              name="itineraryDetailAr[]"
              rows={2}
            />
            <TextareaField
              defaultValue={value.detail_en ?? ""}
              dir="ltr"
              label={t("itineraryDetailEn")}
              maxLength={1000}
              name="itineraryDetailEn[]"
              rows={2}
            />
          </FieldGrid>
        </div>
      ))}
      <Button
        className="w-fit"
        disabled={rows.length >= MAX_ITINERARY_STEPS}
        onClick={add}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {t("addItineraryDay")}
      </Button>
    </fieldset>
  );
};

/** Included in the price, or paid on top; a hidden field keeps rows aligned. */
const IncludedBox = ({ initial }: { readonly initial: boolean }) => {
  const t = useTranslations("admin.editorial.programs");
  const id = useId();
  const [included, setIncluded] = useState(initial);
  return (
    <div className="flex items-center gap-2 self-end pb-2">
      <input
        name="costIncluded[]"
        type="hidden"
        value={included ? "yes" : "no"}
      />
      <input
        checked={included}
        className="size-4 shrink-0 accent-primary"
        id={id}
        onChange={(event) => setIncluded(event.target.checked)}
        type="checkbox"
      />
      <label className="text-sm" htmlFor={id}>
        {t("costIncluded")}
      </label>
    </div>
  );
};

/** Every cost: in the package price, or paid on top (amount known or not). */
const Costs = ({ lines }: { readonly lines: CostLine[] }) => {
  const t = useTranslations("admin.editorial.programs");
  const { add, remove, rows } = useRows<Partial<CostLine>>(lines, {});
  return (
    <fieldset className="grid gap-3">
      <legend className="font-medium text-sm">{t("costs")}</legend>
      <p className="text-muted-foreground text-xs">{t("costsHint")}</p>
      {rows.map(({ key, value }) => (
        <div
          className="grid items-end gap-3 rounded-md border p-3 sm:grid-cols-[1fr_1fr_10rem_auto_auto]"
          key={key}
        >
          <TextField
            defaultValue={value.label_ar ?? ""}
            dir="rtl"
            label={t("costLabelAr")}
            maxLength={200}
            name="costLabelAr[]"
          />
          <TextField
            defaultValue={value.label_en ?? ""}
            dir="ltr"
            label={t("costLabelEn")}
            maxLength={200}
            name="costLabelEn[]"
          />
          <TextField
            defaultValue={value.amount ?? ""}
            inputMode="numeric"
            label={t("costAmount")}
            name="costAmount[]"
          />
          <IncludedBox initial={value.included ?? false} />
          <Button
            aria-label={t("removeCost")}
            onClick={() => remove(key)}
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
        disabled={rows.length >= MAX_COST_LINES}
        onClick={add}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlusIcon />
        {t("addCost")}
      </Button>
    </fieldset>
  );
};

/**
 * The package one of The IDEA's programs is sold as: price, seats, ages,
 * what's included, the itinerary, every cost, installments and refunds.
 */
export const ProgramForm = ({
  opportunityId,
  program,
}: {
  readonly opportunityId: string;
  readonly program: Tables<"programs"> | null;
}) => {
  const t = useTranslations("admin.editorial.programs");
  return (
    <ActionForm action={saveProgram} className="grid gap-4">
      <input name="id" type="hidden" value={opportunityId} />
      <FieldGrid>
        <TextField
          defaultValue={program?.price ?? ""}
          hint={t("priceHint")}
          inputMode="numeric"
          label={t("price")}
          name="price"
          required
        />
        <TextField
          defaultValue={program?.plus_price ?? ""}
          hint={t("plusPriceHint")}
          inputMode="numeric"
          label={t("plusPrice")}
          name="plusPrice"
        />
        <TextField
          defaultValue={program?.seats ?? ""}
          inputMode="numeric"
          label={t("seats")}
          name="seats"
        />
        <TextField
          defaultValue={program?.pay_within_days ?? 7}
          inputMode="numeric"
          label={t("payWithinDays")}
          name="payWithinDays"
        />
        <TextField
          defaultValue={program?.min_age ?? 13}
          inputMode="numeric"
          label={t("minAge")}
          name="minAge"
        />
        <TextField
          defaultValue={program?.max_age ?? ""}
          inputMode="numeric"
          label={t("maxAge")}
          name="maxAge"
        />
      </FieldGrid>
      <div className="grid gap-3">
        <CheckboxField
          defaultChecked={program?.travel ?? true}
          label={t("travel")}
          name="travel"
        />
        <CheckboxField
          defaultChecked={program?.insurance ?? true}
          hint={t("insuranceHint")}
          label={t("insurance")}
          name="insurance"
        />
        <CheckboxField
          defaultChecked={program?.chaperone ?? true}
          hint={t("chaperoneHint")}
          label={t("chaperone")}
          name="chaperone"
        />
        <CheckboxField
          defaultChecked={program?.passport_required ?? true}
          label={t("passportRequired")}
          name="passportRequired"
        />
      </div>
      <FieldGrid>
        <TextareaField
          defaultValue={program?.includes_ar ?? ""}
          dir="rtl"
          label={t("includesAr")}
          maxLength={2000}
          name="includesAr"
          rows={4}
        />
        <TextareaField
          defaultValue={program?.includes_en ?? ""}
          dir="ltr"
          label={t("includesEn")}
          maxLength={2000}
          name="includesEn"
          rows={4}
        />
      </FieldGrid>
      <Itinerary
        steps={(program?.itinerary ?? []) as unknown as ItineraryStep[]}
      />
      <Costs lines={(program?.costs ?? []) as unknown as CostLine[]} />
      <Installments
        plan={(program?.installments ?? []) as unknown as Installment[]}
      />
      <RefundSchedule
        schedule={(program?.refund_schedule ?? []) as unknown as RefundStep[]}
      />
      <TextField
        defaultValue={program?.visa_refund_rate ?? 100}
        hint={t("visaRefundHint")}
        inputMode="numeric"
        label={t("visaRefundRate")}
        name="visaRefundRate"
        wrapperClassName="max-w-xs"
      />
      <SubmitButton className="justify-self-start">{t("save")}</SubmitButton>
    </ActionForm>
  );
};
