"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextareaField, TextField } from "@/components/admin/fields";
import { saveOrderNotes } from "../actions";

export const OrderNotesForm = ({
  disabled,
  id,
  staffNote,
  trackingNumber,
}: {
  readonly disabled: boolean;
  readonly id: string;
  readonly staffNote: string | null;
  readonly trackingNumber: string | null;
}) => {
  const t = useTranslations("admin.orders");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveOrderNotes}>
      <input name="id" type="hidden" value={id} />
      <fieldset className="grid gap-4" disabled={disabled}>
        <TextField
          defaultValue={trackingNumber ?? ""}
          dir="ltr"
          label={t("tracking")}
          maxLength={120}
          name="trackingNumber"
        />
        <TextareaField
          defaultValue={staffNote ?? ""}
          hint={t("staffNoteHint")}
          label={t("staffNote")}
          maxLength={2000}
          name="staffNote"
          rows={4}
        />
        {disabled ? null : (
          <SubmitButton className="w-fit">{tCommon("save")}</SubmitButton>
        )}
      </fieldset>
    </ActionForm>
  );
};
