"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { FieldGrid, TextareaField, TextField } from "@/components/fields";
import { FileUpload } from "@/components/file-upload";
import { Panel } from "@/components/page";
import type { PublishMode } from "@/lib/publishing";
import { saveIssue } from "../actions";
import { PublishField } from "./publish-field";

interface IssueFormProps {
  readonly issue?: Tables<"journal_issues">;
  readonly mode: PublishMode;
  readonly publishAt: string;
  readonly supabaseUrl: string;
}

/** A journal issue: its PDF, cover and bilingual description. */
export const IssueForm = ({
  issue,
  mode,
  publishAt,
  supabaseUrl,
}: IssueFormProps) => {
  const t = useTranslations("admin.editorial.journal");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveIssue}>
      {issue ? <input name="id" type="hidden" value={issue.id} /> : null}
      <Panel>
        <FieldGrid columns={4}>
          <TextField
            defaultValue={issue?.volume ?? ""}
            dir="ltr"
            inputMode="numeric"
            label={t("volume")}
            name="volume"
            required
          />
          <TextField
            defaultValue={issue?.issue ?? ""}
            dir="ltr"
            inputMode="numeric"
            label={t("issue")}
            name="issue"
            required
          />
        </FieldGrid>
        <FieldGrid>
          <TextField
            defaultValue={issue?.title_ar}
            dir="rtl"
            label={t("titleAr")}
            maxLength={200}
            name="titleAr"
            required
          />
          <TextField
            defaultValue={issue?.title_en}
            dir="ltr"
            label={t("titleEn")}
            maxLength={200}
            name="titleEn"
            required
          />
          <TextareaField
            defaultValue={issue?.description_ar ?? ""}
            dir="rtl"
            label={t("descriptionAr")}
            maxLength={5000}
            name="descriptionAr"
            rows={4}
          />
          <TextareaField
            defaultValue={issue?.description_en ?? ""}
            dir="ltr"
            label={t("descriptionEn")}
            maxLength={5000}
            name="descriptionEn"
            rows={4}
          />
        </FieldGrid>
        <FileUpload
          accept="pdf"
          bucket="editorial"
          defaultPaths={issue?.pdf_path ? [issue.pdf_path] : []}
          folder="journal"
          hint={t("pdfHint")}
          label={t("pdf")}
          name="pdfPath"
          supabaseUrl={supabaseUrl}
        />
        <FileUpload
          accept="image"
          bucket="editorial"
          defaultPaths={issue?.cover_image ? [issue.cover_image] : []}
          folder="journal"
          label={t("cover")}
          name="coverImage"
          supabaseUrl={supabaseUrl}
        />
      </Panel>
      <Panel>
        <PublishField defaultMode={mode} defaultPublishAt={publishAt} />
      </Panel>
      <div className="flex justify-end">
        <SubmitButton>{tCommon("save")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
