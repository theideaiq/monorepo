"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, FieldGrid, TextField } from "@/components/admin/fields";
import { addUniversity, reviewStudentCard, saveUniversity } from "../actions";

/** Approve (until a date, by default the end of the year) or reject. */
export const ReviewCardForm = ({
  id,
  yearEnd,
}: {
  readonly id: string;
  /** The end of the academic year (YYYY-MM-DD). */
  readonly yearEnd: string;
}) => {
  const t = useTranslations("admin.customers.students");
  return (
    <div className="grid gap-3">
      <ActionForm
        action={reviewStudentCard}
        className="flex flex-wrap items-end gap-3"
      >
        <input name="id" type="hidden" value={id} />
        <input name="approve" type="hidden" value="true" />
        <TextField
          defaultValue={yearEnd}
          label={t("until")}
          max={yearEnd}
          name="until"
          type="date"
          wrapperClassName="w-44"
        />
        <SubmitButton size="sm">{t("approve")}</SubmitButton>
      </ActionForm>
      <ActionForm
        action={reviewStudentCard}
        className="flex flex-wrap items-end gap-3"
      >
        <input name="id" type="hidden" value={id} />
        <input name="approve" type="hidden" value="false" />
        <TextField
          label={t("reason")}
          name="reason"
          required
          wrapperClassName="min-w-56 flex-1"
        />
        <SubmitButton size="sm" variant="outline">
          {t("reject")}
        </SubmitButton>
      </ActionForm>
    </div>
  );
};

interface University {
  active: boolean;
  domains: string[];
  id: string;
  name_ar: string;
  name_en: string;
}

/** A university's names, email domains and whether it's listed. */
export const UniversityForm = ({
  disabled,
  university,
}: {
  readonly disabled: boolean;
  readonly university?: University;
}) => {
  const t = useTranslations("admin.customers.students");
  const tCommon = useTranslations("admin.common");
  return (
    <ActionForm
      action={university ? saveUniversity : addUniversity}
      className="rounded-md border p-3"
    >
      <fieldset disabled={disabled}>
        <FieldGrid columns={4}>
          {university ? (
            <input name="id" type="hidden" value={university.id} />
          ) : (
            <TextField dir="ltr" label={t("id")} name="id" required />
          )}
          <TextField
            defaultValue={university?.name_ar}
            label={t("nameAr")}
            name="nameAr"
            required
          />
          <TextField
            defaultValue={university?.name_en}
            label={t("nameEn")}
            name="nameEn"
            required
          />
          <TextField
            defaultValue={university?.domains.join(", ")}
            dir="ltr"
            hint={t("domainsHint")}
            label={t("domains")}
            name="domains"
          />
          <div className="flex items-end justify-between gap-3">
            {university ? (
              <CheckboxField
                defaultChecked={university.active}
                label={t("listed")}
                name="active"
              />
            ) : null}
            {disabled ? null : (
              <SubmitButton size="sm">
                {university ? tCommon("save") : t("add")}
              </SubmitButton>
            )}
          </div>
        </FieldGrid>
      </fieldset>
    </ActionForm>
  );
};
