"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { markProgramRefunded } from "../actions";

/** Records a program refund paid by Wayl or cash, with its reference. */
export const RefundForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.finance.programs");
  return (
    <ActionForm
      action={markProgramRefunded}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        label={t("reference")}
        maxLength={200}
        name="reference"
        wrapperClassName="w-48"
      />
      <SubmitButton size="sm">{t("markRefunded")}</SubmitButton>
    </ActionForm>
  );
};
