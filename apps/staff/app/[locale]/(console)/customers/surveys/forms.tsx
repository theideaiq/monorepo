"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { reviewSurvey } from "../actions";

/** Approve (it opens, or reopens) or reject with a note to the creator. */
export const ReviewSurveyForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.customers.surveys");
  return (
    <ActionForm
      action={reviewSurvey}
      className="flex flex-wrap items-end gap-3"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        label={t("note")}
        name="note"
        wrapperClassName="min-w-56 flex-1"
      />
      <SubmitButton name="approve" size="sm" value="true">
        {t("approve")}
      </SubmitButton>
      <SubmitButton name="approve" size="sm" value="false" variant="outline">
        {t("reject")}
      </SubmitButton>
    </ActionForm>
  );
};
