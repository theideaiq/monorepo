"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SelectField, TextField } from "@/components/fields";
import { MarkdownEditor } from "@/components/markdown-editor";
import { saveCampaign } from "../actions";

interface CampaignFormProps {
  readonly campaign?: {
    body: string;
    id: string;
    segment_id: string | null;
    subject: string;
  };
  readonly segments: { id: string; name: string }[];
}

/** Subject, audience and Markdown body of a draft campaign. */
export const CampaignForm = ({ campaign, segments }: CampaignFormProps) => {
  const t = useTranslations("admin.marketing.campaigns");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveCampaign}>
      {campaign ? <input name="id" type="hidden" value={campaign.id} /> : null}
      <TextField
        defaultValue={campaign?.subject}
        label={t("subject")}
        maxLength={200}
        name="subject"
        required
      />
      <SelectField
        defaultValue={campaign?.segment_id ?? ""}
        hint={t("segmentHint")}
        label={t("segment")}
        name="segmentId"
        options={[
          { label: t("everyone"), value: "" },
          ...segments.map((segment) => ({
            label: segment.name,
            value: segment.id,
          })),
        ]}
      />
      <MarkdownEditor
        defaultValue={campaign?.body}
        dir="auto"
        hint={t("bodyHint")}
        label={t("body")}
        maxLength={50_000}
        name="body"
        rows={18}
      />
      <div className="flex justify-end">
        <SubmitButton>{campaign ? tCommon("save") : t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
