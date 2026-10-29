"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { deleteTerm, saveTerm } from "../actions";

/** One academic term: its names and dates. */
export const TermForm = ({
  disabled = false,
  term,
}: {
  readonly disabled?: boolean;
  readonly term?: Tables<"academic_terms">;
}) => {
  const t = useTranslations("admin.finance.terms");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <ActionForm
        action={saveTerm}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {term ? <input name="id" type="hidden" value={term.id} /> : null}
        <TextField
          defaultValue={term?.name_ar}
          dir="rtl"
          disabled={disabled}
          label={t("nameAr")}
          name="nameAr"
          wrapperClassName="min-w-36 flex-1"
        />
        <TextField
          defaultValue={term?.name_en}
          dir="ltr"
          disabled={disabled}
          label={t("nameEn")}
          name="nameEn"
          wrapperClassName="min-w-36 flex-1"
        />
        <TextField
          defaultValue={term?.starts_on}
          dir="ltr"
          disabled={disabled}
          label={t("startsOn")}
          name="startsOn"
          type="date"
          wrapperClassName="w-40"
        />
        <TextField
          defaultValue={term?.ends_on}
          dir="ltr"
          disabled={disabled}
          label={t("endsOn")}
          name="endsOn"
          type="date"
          wrapperClassName="w-40"
        />
        {disabled ? null : (
          <SubmitButton variant={term ? "secondary" : "default"}>
            {term ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {term && !disabled ? (
        <ActionButton
          action={deleteTerm}
          confirm={{
            description: t("deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: term.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
