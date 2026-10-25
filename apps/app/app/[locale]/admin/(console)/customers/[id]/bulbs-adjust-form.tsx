"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { adjustBulbs } from "../actions";

/** Adds (positive) or takes away (negative) Bulbs, with a reason. */
export const BulbsAdjustForm = ({ userId }: { readonly userId: string }) => {
  const t = useTranslations("admin.customers.bulbs");
  return (
    <ActionForm action={adjustBulbs} className="border-t pt-3" resetOnSuccess>
      <input name="userId" type="hidden" value={userId} />
      <TextField
        dir="ltr"
        hint={t("amountHint")}
        inputMode="numeric"
        label={t("amount")}
        name="bulbs"
        required
      />
      <TextField label={t("reason")} maxLength={300} name="reason" required />
      <SubmitButton size="sm" variant="secondary">
        {t("adjust")}
      </SubmitButton>
    </ActionForm>
  );
};
