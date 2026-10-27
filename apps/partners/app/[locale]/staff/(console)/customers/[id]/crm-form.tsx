"use client";

import { CalendarCheckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { crmStatuses } from "@/lib/admin/crm";
import { toBaghdadInput } from "@/lib/admin/dates";
import { markContacted, saveCrmContact } from "../actions";

interface CrmFormProps {
  readonly disabled: boolean;
  /** ISO timestamp of the last contact, if any. */
  readonly lastContactedAt: string | null;
  /** The same, formatted for display. */
  readonly lastContactedLabel: string | null;
  readonly notes: string | null;
  readonly status: string;
  readonly tags: string[];
  readonly updatedAt: string | null;
  readonly userId: string;
}

export const CrmForm = ({
  disabled,
  lastContactedAt,
  lastContactedLabel,
  notes,
  status,
  tags,
  updatedAt,
  userId,
}: CrmFormProps) => {
  const t = useTranslations("admin.customers");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/50 p-3 text-sm">
        <span>
          {lastContactedLabel
            ? t("lastContactedOn", { date: lastContactedLabel })
            : t("neverContacted")}
        </span>
        {disabled ? null : (
          <ActionButton action={markContacted} fields={{ userId }}>
            <CalendarCheckIcon />
            {t("contactedToday")}
          </ActionButton>
        )}
      </div>
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
          <TextField
            // Re-mounts when "contacted today" changes the stored value.
            defaultValue={toBaghdadInput(lastContactedAt)}
            hint={t("lastContactedHint")}
            key={lastContactedAt ?? "never"}
            label={t("lastContacted")}
            name="lastContactedAt"
            type="datetime-local"
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
    </div>
  );
};
