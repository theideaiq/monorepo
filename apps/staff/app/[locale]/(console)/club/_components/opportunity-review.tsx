"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { featureOpportunity, reviewOpportunity } from "../actions";

const DECISIONS = ["approved", "changes", "rejected"] as const;

/** Approve, ask for changes (with what) or refuse an organization's listing. */
export const ReviewOpportunityForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.editorial.opportunities");
  return (
    <ActionForm action={reviewOpportunity} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <SelectField
        defaultValue="approved"
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

/** Featured until a Baghdad time (the paid extra); empty stops it. */
export const FeatureOpportunityForm = ({
  id,
  until,
}: {
  readonly id: string;
  readonly until: string;
}) => {
  const t = useTranslations("admin.editorial.opportunities");
  return (
    <ActionForm action={featureOpportunity}>
      <input name="id" type="hidden" value={id} />
      <FieldGrid columns={2}>
        <TextField
          defaultValue={until}
          hint={t("featuredHint")}
          label={t("featuredUntil")}
          name="until"
          type="datetime-local"
        />
        <div className="flex items-end">
          <SubmitButton size="sm" variant="outline">
            {t("saveFeatured")}
          </SubmitButton>
        </div>
      </FieldGrid>
    </ActionForm>
  );
};
