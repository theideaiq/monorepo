"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import {
  ActionForm,
  FormError,
  SubmitButton,
} from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import {
  partnerKinds,
  partnerStages,
  priorities,
} from "@/lib/admin/partner-crm";
import type { CrmStaffMember } from "@/lib/admin/partner-crm-staff";
import { savePartnerOrg } from "../actions";

/**
 * An organization's details: who it is, its stage and priority, who owns
 * it and its next action (an action and its date, set together).
 */
export const OrgForm = ({
  defaultOwner,
  org,
  staff,
}: {
  /** The owner a new organization starts with (the staff member). */
  readonly defaultOwner?: string;
  readonly org?: Tables<"partner_orgs">;
  readonly staff: readonly CrmStaffMember[];
}) => {
  const t = useTranslations("admin.partnerCrm");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={savePartnerOrg}>
      {org ? <input name="id" type="hidden" value={org.id} /> : null}
      <Panel title={t("organization")}>
        <FieldGrid>
          <TextField
            defaultValue={org?.name}
            label={t("fields.name")}
            maxLength={200}
            name="name"
            required
          />
          <TextField
            defaultValue={org?.name_ar ?? ""}
            dir="rtl"
            label={t("fields.nameAr")}
            maxLength={200}
            name="nameAr"
          />
          <SelectField
            defaultValue={org?.kind ?? "other"}
            label={t("fields.kind")}
            name="kind"
            options={partnerKinds.map((kind) => ({
              label: t(`kinds.${kind}`),
              value: kind,
            }))}
          />
          <TextField
            defaultValue={org?.country ?? ""}
            dir="ltr"
            hint={t("fields.countryHint")}
            label={t("fields.country")}
            maxLength={2}
            name="country"
          />
          <TextField
            defaultValue={org?.city ?? ""}
            label={t("fields.city")}
            maxLength={120}
            name="city"
          />
          <TextField
            defaultValue={org?.website ?? ""}
            dir="ltr"
            hint={t("fields.urlHint")}
            label={t("fields.website")}
            maxLength={500}
            name="website"
            type="url"
          />
          <TextField
            defaultValue={org?.email ?? ""}
            dir="ltr"
            hint={t("fields.emailHint")}
            label={t("fields.email")}
            maxLength={254}
            name="email"
            type="email"
          />
          <TextField
            defaultValue={org?.source_url ?? ""}
            dir="ltr"
            hint={t("fields.sourceUrlHint")}
            label={t("fields.sourceUrl")}
            maxLength={1000}
            name="sourceUrl"
            type="url"
          />
        </FieldGrid>
      </Panel>
      <Panel title={t("pipeline")}>
        <FieldGrid columns={3}>
          <SelectField
            defaultValue={org?.stage ?? "prospect"}
            label={t("fields.stage")}
            name="stage"
            options={partnerStages.map((stage) => ({
              label: t(`stages.${stage}`),
              value: stage,
            }))}
          />
          <SelectField
            defaultValue={String(org?.priority ?? 2)}
            label={t("fields.priority")}
            name="priority"
            options={priorities.map((priority) => ({
              label: t(`priorities.${priority}`),
              value: String(priority),
            }))}
          />
          <SelectField
            defaultValue={org ? (org.owner_id ?? "") : (defaultOwner ?? "")}
            label={t("fields.owner")}
            name="ownerId"
            options={[
              { label: t("noOwner"), value: "" },
              ...staff.map((member) => ({
                label: member.name ?? t("unnamedStaff"),
                value: member.id,
              })),
            ]}
          />
          <TextField
            defaultValue={org?.next_action ?? ""}
            hint={t("fields.nextActionHint")}
            label={t("fields.nextAction")}
            maxLength={300}
            name="nextAction"
            wrapperClassName="sm:col-span-2"
          />
          <TextField
            defaultValue={org?.next_action_on ?? ""}
            label={t("fields.nextActionOn")}
            name="nextActionOn"
            type="date"
          />
          <TextField
            defaultValue={org?.tags.join(", ") ?? ""}
            hint={t("fields.tagsHint")}
            label={t("fields.tags")}
            name="tags"
            wrapperClassName="sm:col-span-3"
          />
          <TextareaField
            defaultValue={org?.notes ?? ""}
            label={tCommon("notes")}
            maxLength={10_000}
            name="notes"
            rows={4}
            wrapperClassName="sm:col-span-3"
          />
        </FieldGrid>
        <FormError />
      </Panel>
      <div className="flex justify-end">
        <SubmitButton>{org ? tCommon("save") : tCommon("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
