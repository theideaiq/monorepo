"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { decideSeller } from "../actions";

const DECISIONS = ["approved", "rejected", "suspended"] as const;

/** Approve, reject or suspend a shop, with a note and its deposit. */
export const DecideSellerForm = ({
  deposit,
  id,
  note,
}: {
  readonly deposit: number;
  readonly id: string;
  readonly note: string;
}) => {
  const t = useTranslations("admin.companies.shops");
  return (
    <ActionForm action={decideSeller} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <FieldGrid columns={2}>
        <SelectField
          label={t("decision")}
          name="decision"
          options={DECISIONS.map((decision) => ({
            label: t(`statuses.${decision}`),
            value: decision,
          }))}
        />
        <TextField
          defaultValue={deposit > 0 ? String(deposit) : ""}
          dir="ltr"
          hint={t("depositHint")}
          inputMode="numeric"
          label={t("deposit")}
          name="deposit"
        />
      </FieldGrid>
      <TextareaField
        defaultValue={note}
        hint={t("noteHint")}
        label={t("note")}
        maxLength={1000}
        name="note"
        rows={2}
      />
      <SubmitButton className="justify-self-start">{t("save")}</SubmitButton>
    </ActionForm>
  );
};
