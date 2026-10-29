"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField, TextareaField } from "@/components/admin/fields";
import { endApplication, reviewApplication } from "../actions";

const DECISIONS = ["accepted", "waitlisted", "refused"] as const;

/** Accept (fixing the price and installments), waitlist or refuse. */
export const ReviewApplicationForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.editorial.programs");
  return (
    <ActionForm action={reviewApplication} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <SelectField
        defaultValue="accepted"
        label={t("decision")}
        name="decision"
        options={DECISIONS.map((decision) => ({
          label: t(`decisions.${decision}`),
          value: decision,
        }))}
        wrapperClassName="max-w-xs"
      />
      <TextareaField
        hint={t("noteHint")}
        label={t("note")}
        maxLength={1000}
        name="note"
        rows={3}
      />
      <SubmitButton className="justify-self-start" size="sm">
        {t("sendDecision")}
      </SubmitButton>
    </ActionForm>
  );
};

type Outcome = "completed" | "the_idea" | "unpaid" | "visa_refused";

/** Ends a place; the refund follows the program's rules. */
export const EndApplicationForm = ({
  id,
  outcomes,
}: {
  readonly id: string;
  readonly outcomes: readonly Outcome[];
}) => {
  const t = useTranslations("admin.editorial.programs");
  return (
    <ActionForm action={endApplication} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <p className="text-muted-foreground text-sm">{t("endDescription")}</p>
      <SelectField
        defaultValue={outcomes[0]}
        label={t("outcome")}
        name="outcome"
        options={outcomes.map((outcome) => ({
          label: t(`outcomes.${outcome}`),
          value: outcome,
        }))}
        wrapperClassName="max-w-xs"
      />
      <SubmitButton className="justify-self-start" size="sm" variant="outline">
        {t("end")}
      </SubmitButton>
    </ActionForm>
  );
};
