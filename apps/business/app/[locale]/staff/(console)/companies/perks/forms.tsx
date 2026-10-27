"use client";

import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import { addPerk, setPerkActive } from "../actions";

const KINDS = [
  "cafe",
  "books",
  "print",
  "gaming",
  "cinema",
  "music",
  "repair",
  "courses",
  "other",
] as const;
const AUDIENCES = ["everyone", "students", "plus"] as const;

/** A new perk for one of the partner organizations. */
export const AddPerkForm = ({
  organizations,
}: {
  readonly organizations: { label: string; value: string }[];
}) => {
  const t = useTranslations("admin.companies.perks");
  return (
    <ActionForm action={addPerk} className="grid gap-4">
      <FieldGrid columns={3}>
        <SelectField
          hint={t("organizationHint")}
          label={t("organization")}
          name="organization"
          options={organizations}
        />
        <TextField label={t("partnerName")} name="partnerName" required />
        <SelectField
          label={t("kind")}
          name="kind"
          options={KINDS.map((kind) => ({
            label: t(`kinds.${kind}`),
            value: kind,
          }))}
        />
        <TextField label={t("titleAr")} name="titleAr" required />
        <TextField label={t("titleEn")} name="titleEn" required />
        <SelectField
          label={t("audience")}
          name="audience"
          options={AUDIENCES.map((audience) => ({
            label: t(`audiences.${audience}`),
            value: audience,
          }))}
        />
        <TextField label={t("detailsAr")} name="detailsAr" />
        <TextField label={t("detailsEn")} name="detailsEn" />
        <div />
        <TextField label={t("areaAr")} name="areaAr" />
        <TextField label={t("areaEn")} name="areaEn" />
      </FieldGrid>
      <div>
        <SubmitButton size="sm">{t("add")}</SubmitButton>
      </div>
    </ActionForm>
  );
};

export const PerkToggle = ({
  active,
  id,
}: {
  readonly active: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("admin.companies.perks");
  return (
    <ActionButton
      action={setPerkActive}
      fields={{ active: String(!active), id }}
      variant="ghost"
    >
      {active ? t("stop") : t("offerAgain")}
    </ActionButton>
  );
};
