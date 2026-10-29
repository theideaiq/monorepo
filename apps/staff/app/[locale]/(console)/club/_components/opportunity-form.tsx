"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/file-upload";
import { Panel } from "@/components/admin/page";
import { saveOpportunity } from "../actions";

export const OPPORTUNITY_KINDS = [
  "job",
  "internship",
  "scholarship",
  "competition",
  "program",
] as const;

interface OpportunityFormProps {
  /** Baghdad `datetime-local` values. */
  readonly deadline: string;
  readonly opensAt: string;
  readonly opportunity?: Tables<"opportunities">;
  readonly supabaseUrl: string;
}

/**
 * An opportunity's details. The IDEA's own are listed with the checkbox;
 * an organization's keep their review status (see the review panel).
 */
export const OpportunityForm = ({
  deadline,
  opensAt,
  opportunity,
  supabaseUrl,
}: OpportunityFormProps) => {
  const t = useTranslations("admin.editorial.opportunities");
  const tCommon = useTranslations("admin.common");
  const own = !opportunity?.organization_id;

  return (
    <ActionForm action={saveOpportunity}>
      {opportunity ? (
        <input name="id" type="hidden" value={opportunity.id} />
      ) : null}
      <Panel>
        <FieldGrid>
          <SelectField
            defaultValue={opportunity?.kind ?? "program"}
            label={t("kind")}
            name="kind"
            options={OPPORTUNITY_KINDS.map((kind) => ({
              label: t(`kinds.${kind}`),
              value: kind,
            }))}
          />
          <TextField
            defaultValue={opportunity?.location ?? ""}
            hint={t("locationHint")}
            label={t("location")}
            maxLength={160}
            name="location"
          />
          <TextField
            defaultValue={opportunity?.title_ar}
            dir="rtl"
            label={t("titleAr")}
            maxLength={160}
            name="titleAr"
            required
          />
          <TextField
            defaultValue={opportunity?.title_en}
            dir="ltr"
            label={t("titleEn")}
            maxLength={160}
            name="titleEn"
            required
          />
          <TextField
            defaultValue={opportunity?.summary_ar ?? ""}
            dir="rtl"
            label={t("summaryAr")}
            maxLength={300}
            name="summaryAr"
          />
          <TextField
            defaultValue={opportunity?.summary_en ?? ""}
            dir="ltr"
            label={t("summaryEn")}
            maxLength={300}
            name="summaryEn"
          />
          <TextField
            defaultValue={opensAt}
            hint={t("opensHint")}
            label={t("opensAt")}
            name="opensAt"
            type="datetime-local"
          />
          <TextField
            defaultValue={deadline}
            hint={t("deadlineHint")}
            label={t("deadline")}
            name="deadline"
            type="datetime-local"
          />
          <TextField
            defaultValue={opportunity?.starts_on ?? ""}
            label={t("startsOn")}
            name="startsOn"
            type="date"
          />
          <TextField
            defaultValue={opportunity?.ends_on ?? ""}
            label={t("endsOn")}
            name="endsOn"
            type="date"
          />
          <TextField
            defaultValue={opportunity?.apply_url ?? ""}
            dir="ltr"
            hint={t("applyUrlHint")}
            label={t("applyUrl")}
            maxLength={500}
            name="applyUrl"
            type="url"
          />
          <TextField
            defaultValue={opportunity?.applicant_fee || ""}
            dir="ltr"
            hint={t("feeHint")}
            inputMode="numeric"
            label={t("fee")}
            name="applicantFee"
          />
          <TextField
            defaultValue={opportunity?.fee_note ?? ""}
            label={t("feeNote")}
            maxLength={300}
            name="feeNote"
            wrapperClassName="sm:col-span-2"
          />
        </FieldGrid>
        <CheckboxField
          defaultChecked={opportunity?.remote ?? false}
          label={t("remote")}
          name="remote"
        />
        <FieldGrid>
          <TextareaField
            defaultValue={opportunity?.description_ar ?? ""}
            dir="rtl"
            label={t("descriptionAr")}
            maxLength={10_000}
            name="descriptionAr"
            rows={8}
          />
          <TextareaField
            defaultValue={opportunity?.description_en ?? ""}
            dir="ltr"
            label={t("descriptionEn")}
            maxLength={10_000}
            name="descriptionEn"
            rows={8}
          />
        </FieldGrid>
        <FileUpload
          accept="image"
          bucket="editorial"
          defaultPaths={
            opportunity?.cover_image ? [opportunity.cover_image] : []
          }
          folder="opportunities"
          label={t("cover")}
          name="coverImage"
          supabaseUrl={supabaseUrl}
        />
        {own ? (
          <CheckboxField
            defaultChecked={
              opportunity ? opportunity.status === "approved" : false
            }
            hint={t("listedHint")}
            label={t("listed")}
            name="listed"
          />
        ) : null}
      </Panel>
      <div className="flex justify-end">
        <SubmitButton>{tCommon("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
