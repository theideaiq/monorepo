"use client";

import { Constants, type Tables } from "@repo/database";
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

const { Enums } = Constants.public;

interface OpportunityFormProps {
  /** Baghdad `datetime-local` values. */
  readonly deadline: string;
  /** Unclaimed organizations a new listing can go under. */
  readonly hosts?: readonly { id: string; name: string }[];
  /** Whether a listing's status is set here: no organization is reviewing it. */
  readonly listable: boolean;
  readonly opensAt: string;
  readonly opportunity?: Tables<"opportunities">;
  readonly supabaseUrl: string;
}

/** What the Club filters on, with the source and when it was last checked. */
const CatalogFields = ({
  opportunity,
}: {
  readonly opportunity?: Tables<"opportunities">;
}) => {
  const t = useTranslations("admin.editorial.opportunities");
  return (
    <>
      <FieldGrid>
        <SelectField
          defaultValue={opportunity?.funding_type ?? "unknown"}
          label={t("funding")}
          name="funding"
          options={Enums.opportunity_funding.map((funding) => ({
            label: t(`fundingTypes.${funding}`),
            value: funding,
          }))}
        />
        <SelectField
          defaultValue={opportunity?.iraqi_eligibility ?? ""}
          hint={t("eligibilityHint")}
          label={t("eligibility")}
          name="eligibility"
          options={[
            { label: t("eligibilityNone"), value: "" },
            ...Enums.opportunity_eligibility.map((grade) => ({
              label: t(`eligibilityGrades.${grade}`),
              value: grade,
            })),
          ]}
        />
        <TextField
          defaultValue={opportunity?.min_age ?? ""}
          dir="ltr"
          inputMode="numeric"
          label={t("minAge")}
          name="minAge"
        />
        <TextField
          defaultValue={opportunity?.max_age ?? ""}
          dir="ltr"
          inputMode="numeric"
          label={t("maxAge")}
          name="maxAge"
        />
        <TextField
          defaultValue={opportunity?.destination_countries?.join(", ") ?? ""}
          dir="ltr"
          hint={t("countriesHint")}
          label={t("countries")}
          name="countries"
        />
        <TextField
          defaultValue={opportunity?.last_checked_on ?? ""}
          hint={t("lastCheckedHint")}
          label={t("lastChecked")}
          name="lastChecked"
          type="date"
        />
        <TextField
          defaultValue={opportunity?.source_url ?? ""}
          dir="ltr"
          hint={t("sourceUrlHint")}
          label={t("sourceUrl")}
          maxLength={500}
          name="sourceUrl"
          type="url"
          wrapperClassName="sm:col-span-2"
        />
      </FieldGrid>
      <fieldset>
        <legend className="mb-1 font-medium text-sm">{t("levels")}</legend>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {Enums.opportunity_level.map((level) => (
            <CheckboxField
              defaultChecked={opportunity?.levels?.includes(level) ?? false}
              key={level}
              label={t(`levelNames.${level}`)}
              name="levels[]"
              value={level}
            />
          ))}
        </div>
      </fieldset>
    </>
  );
};

/**
 * An opportunity's details. The IDEA's own and unclaimed organizations' are
 * listed with the checkbox; a claimed organization's keep their review
 * status (see the review panel). The host is chosen once, on a new listing.
 */
export const OpportunityForm = ({
  deadline,
  hosts = [],
  listable,
  opensAt,
  opportunity,
  supabaseUrl,
}: OpportunityFormProps) => {
  const t = useTranslations("admin.editorial.opportunities");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveOpportunity}>
      {opportunity ? (
        <input name="id" type="hidden" value={opportunity.id} />
      ) : null}
      <Panel>
        {opportunity ? null : (
          <FieldGrid>
            <SelectField
              defaultValue=""
              hint={t("hostHint")}
              label={t("host")}
              name="hostId"
              options={[
                { label: t("theIdea"), value: "" },
                ...hosts.map((host) => ({
                  label: host.name,
                  value: host.id,
                })),
              ]}
            />
            <TextField
              dir="auto"
              hint={t("hostNewHint")}
              label={t("hostNew")}
              maxLength={120}
              name="hostName"
            />
          </FieldGrid>
        )}
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
        <CatalogFields opportunity={opportunity} />
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
        {listable ? (
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
