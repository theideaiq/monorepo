"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
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

/**
 * The package one of The IDEA's programs is sold as: price, seats, ages,
 * what's included, installments and refunds.
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
