"use client";

import type { Tables } from "@repo/database";
import { Constants } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SelectField, TextField } from "@/components/fields";
import { deletePosition, savePosition } from "../actions";

/** One planned or filled position on the staff plan. */
export const PositionForm = ({
  disabled = false,
  position,
}: {
  readonly disabled?: boolean;
  readonly position?: Tables<"staff_plan">;
}) => {
  const t = useTranslations("admin.finance.payroll");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <ActionForm
        action={savePosition}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {position ? (
          <input name="id" type="hidden" value={position.id} />
        ) : null}
        <TextField
          defaultValue={position?.role_title}
          disabled={disabled}
          label={t("role")}
          maxLength={120}
          name="roleTitle"
          wrapperClassName="min-w-40 flex-1"
        />
        <TextField
          defaultValue={position?.department}
          disabled={disabled}
          label={t("department")}
          maxLength={120}
          name="department"
          wrapperClassName="w-36"
        />
        <TextField
          defaultValue={position?.monthly_salary ?? ""}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={t("salary")}
          name="monthlySalary"
          wrapperClassName="w-36"
        />
        <TextField
          defaultValue={position?.annual_increase_pct ?? 0}
          dir="ltr"
          disabled={disabled}
          inputMode="decimal"
          label={t("increase")}
          name="annualIncrease"
          wrapperClassName="w-24"
        />
        <TextField
          defaultValue={position?.start_date ?? ""}
          disabled={disabled}
          label={t("start")}
          name="startDate"
          type="date"
          wrapperClassName="w-40"
        />
        <SelectField
          defaultValue={position?.status ?? "planned"}
          disabled={disabled}
          label={t("status")}
          name="status"
          options={Constants.public.Enums.staff_plan_status.map((value) => ({
            label: t(`statuses.${value}`),
            value,
          }))}
          wrapperClassName="w-32"
        />
        {disabled ? null : (
          <SubmitButton variant={position ? "secondary" : "default"}>
            {position ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {position && !disabled ? (
        <ActionButton
          action={deletePosition}
          confirm={{ title: tCommon("deleteConfirm") }}
          fields={{ id: position.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
