"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import type { ActionState } from "@/lib/admin/action-state";
import {
  addPassPartner,
  rotatePassPartnerSecret,
  setPassPartnerActive,
} from "../actions";

const ANSWERS = [
  "profile",
  "email",
  "student",
  "adult",
  "plus",
  "card",
] as const;

interface Credentials {
  clientId: string;
  secret: string;
}

const credentialsOf = (state: Extract<ActionState, { status: "success" }>) =>
  (state.data as Credentials | undefined) ?? null;

/** The client id and secret, shown once after they're made. */
const ShowOnce = ({ credentials }: { readonly credentials: Credentials }) => {
  const t = useTranslations("admin.companies.signIn");
  return (
    <div className="grid gap-2 rounded-md border border-pink-text/40 bg-muted p-3 text-sm">
      <p className="font-medium">{t("once")}</p>
      <p>
        {t("clientId")}: <code dir="ltr">{credentials.clientId}</code>
      </p>
      <p className="break-all">
        {t("secret")}: <code dir="ltr">{credentials.secret}</code>
      </p>
    </div>
  );
};

/** Registers a partner site. */
export const AddPartnerForm = ({
  organizations,
}: {
  readonly organizations: { label: string; value: string }[];
}) => {
  const t = useTranslations("admin.companies.signIn");
  const [made, setMade] = useState<Credentials | null>(null);
  return (
    <div className="grid gap-4">
      <ActionForm
        action={addPassPartner}
        className="grid gap-4"
        onSuccess={(state) => setMade(credentialsOf(state))}
        resetOnSuccess
      >
        <FieldGrid columns={3}>
          <TextField label={t("name")} name="name" required />
          <TextField dir="ltr" label={t("website")} name="website" required />
          <SelectField
            hint={t("organizationHint")}
            label={t("organization")}
            name="organization"
            options={[
              { label: t("noOrganization"), value: "" },
              ...organizations,
            ]}
          />
        </FieldGrid>
        <TextareaField
          dir="ltr"
          hint={t("redirectUrisHint")}
          label={t("redirectUris")}
          name="redirectUris"
          required
          rows={3}
        />
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 font-medium text-sm">{t("answers")}</legend>
          {ANSWERS.map((answer) => (
            <CheckboxField
              defaultChecked={answer === "profile" || answer === "email"}
              key={answer}
              label={t(`answerNames.${answer}`)}
              name={answer}
            />
          ))}
        </fieldset>
        <div>
          <SubmitButton size="sm">{t("add")}</SubmitButton>
        </div>
      </ActionForm>
      {made ? <ShowOnce credentials={made} /> : null}
    </div>
  );
};

/** A new secret for a partner (shown once), and turning it off or on. */
export const PartnerActions = ({
  active,
  id,
}: {
  readonly active: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("admin.companies.signIn");
  const [made, setMade] = useState<Credentials | null>(null);
  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <ActionForm
          action={rotatePassPartnerSecret}
          onSuccess={(state) => setMade(credentialsOf(state))}
        >
          <input name="id" type="hidden" value={id} />
          <SubmitButton size="sm" variant="outline">
            {t("rotate")}
          </SubmitButton>
        </ActionForm>
        <ActionButton
          action={setPassPartnerActive}
          fields={{ active: active ? "false" : "true", id }}
          size="sm"
          variant="outline"
        >
          {active ? t("turnOff") : t("turnOn")}
        </ActionButton>
      </div>
      {made ? <ShowOnce credentials={made} /> : null}
    </div>
  );
};
