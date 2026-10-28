"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { createCampaign } from "../actions";

/** A new campaign: names, dates (Baghdad time) and whether it's public. */
export const CampaignForm = () => {
  const t = useTranslations("admin.catalog.campaigns");
  return (
    <ActionForm action={createCampaign} className="grid gap-4" resetOnSuccess>
      <FieldGrid>
        <TextField label={t("nameEn")} maxLength={120} name="nameEn" required />
        <TextField
          dir="rtl"
          label={t("nameAr")}
          maxLength={120}
          name="nameAr"
          required
        />
        <TextField
          dir="ltr"
          hint={t("slugHint")}
          label={t("slug")}
          name="slug"
          required
        />
        <TextField
          hint={t("timeHint")}
          label={t("startsAt")}
          name="startsAt"
          required
          type="datetime-local"
        />
        <TextField
          label={t("endsAt")}
          name="endsAt"
          required
          type="datetime-local"
        />
      </FieldGrid>
      <FieldGrid>
        <TextareaField
          label={t("descriptionEn")}
          maxLength={2000}
          name="descriptionEn"
        />
        <TextareaField
          dir="rtl"
          label={t("descriptionAr")}
          maxLength={2000}
          name="descriptionAr"
        />
      </FieldGrid>
      <CheckboxField label={t("publishNow")} name="published" />
      <div>
        <SubmitButton>{t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
