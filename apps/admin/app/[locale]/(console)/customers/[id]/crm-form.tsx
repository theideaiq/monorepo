"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SelectField, TextareaField, TextField } from "@/components/fields";
import { crmStatuses } from "@/lib/segments";
import { saveCrmContact } from "../actions";

interface CrmFormProps {
  readonly disabled: boolean;
  readonly notes: string | null;
  readonly status: string;
  readonly tags: string[];
  readonly updatedAt: string | null;
  readonly userId: string;
}

export const CrmForm = ({
  disabled,
  notes,
  status,
  tags,
  updatedAt,
  userId,
}: CrmFormProps) => {
  const t = useTranslations("admin.customers");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveCrmContact}>
      <input name="userId" type="hidden" value={userId} />
      <fieldset className="grid gap-4" disabled={disabled}>
        <SelectField
          defaultValue={status}
          label={t("crmStatus")}
          name="status"
          options={crmStatuses.map((value) => ({
            label: t(`statuses.${value}`),
            value,
          }))}
        />
        <TextField
          defaultValue={tags.join(", ")}
          hint={t("tagsHint")}
          label={t("tags")}
          name="tags"
        />
        <TextareaField
          defaultValue={notes ?? ""}
          label={tCommon("notes")}
          maxLength={10_000}
          name="notes"
          rows={5}
        />
        {updatedAt ? (
          <p className="text-muted-foreground text-xs">
            {t("crmUpdated", { date: updatedAt })}
          </p>
        ) : null}
        {disabled ? null : (
          <SubmitButton className="w-fit">{tCommon("save")}</SubmitButton>
        )}
      </fieldset>
    </ActionForm>
  );
};
