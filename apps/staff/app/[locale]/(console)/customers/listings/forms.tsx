"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import { takeDownMemberListing } from "../actions";

/** Take a person's listing down, saying why (the seller is told). */
export const TakeDownForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.customers.listings");
  return (
    <ActionForm
      action={takeDownMemberListing}
      className="flex flex-wrap items-end gap-3"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        label={t("reason")}
        maxLength={500}
        minLength={5}
        name="reason"
        required
        wrapperClassName="min-w-56 flex-1"
      />
      <SubmitButton size="sm" variant="outline">
        {t("takeDown")}
      </SubmitButton>
    </ActionForm>
  );
};
