"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { FileUpload } from "@/components/admin/file-upload";
import { MarkdownEditor } from "@/components/admin/markdown-editor";
import { Panel } from "@/components/admin/page";
import type { PublishMode } from "@/lib/admin/publishing";
import { savePost } from "../actions";
import { PublishField } from "./publish-field";
import { postSections } from "./sections";

interface PostFormProps {
  readonly mode: PublishMode;
  readonly post?: Tables<"posts">;
  readonly publishAt: string;
  readonly supabaseUrl: string;
}

/**
 * A bilingual post of The IDEA Club (its section and byline, Markdown
 * bodies and a cover image).
 */
export const PostForm = ({
  mode,
  post,
  publishAt,
  supabaseUrl,
}: PostFormProps) => {
  const t = useTranslations("admin.editorial.posts");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={savePost}>
      {post ? <input name="id" type="hidden" value={post.id} /> : null}
      <Panel>
        <FieldGrid>
          <TextField
            defaultValue={post?.title_ar}
            dir="rtl"
            label={t("titleAr")}
            maxLength={200}
            name="titleAr"
            required
          />
          <TextField
            defaultValue={post?.title_en}
            dir="ltr"
            label={t("titleEn")}
            maxLength={200}
            name="titleEn"
            required
          />
          <TextField
            defaultValue={post?.slug}
            dir="ltr"
            hint={t("slugHint")}
            label={t("slug")}
            maxLength={120}
            name="slug"
            required
          />
          <SelectField
            defaultValue={post?.section ?? "news"}
            label={t("section")}
            name="section"
            options={postSections.map((value) => ({
              label: t(`sections.${value}`),
              value,
            }))}
          />
          <TextField
            defaultValue={post?.byline ?? ""}
            hint={t("bylineHint")}
            label={t("byline")}
            maxLength={120}
            name="byline"
          />
        </FieldGrid>
        <FieldGrid>
          <TextareaField
            defaultValue={post?.excerpt_ar ?? ""}
            dir="rtl"
            label={t("excerptAr")}
            maxLength={500}
            name="excerptAr"
            rows={2}
          />
          <TextareaField
            defaultValue={post?.excerpt_en ?? ""}
            dir="ltr"
            label={t("excerptEn")}
            maxLength={500}
            name="excerptEn"
            rows={2}
          />
        </FieldGrid>
        <FileUpload
          accept="image"
          bucket="editorial"
          defaultPaths={post?.cover_image ? [post.cover_image] : []}
          folder="posts"
          label={t("cover")}
          name="coverImage"
          supabaseUrl={supabaseUrl}
        />
      </Panel>
      <Panel>
        <MarkdownEditor
          defaultValue={post?.body_ar}
          dir="rtl"
          label={t("bodyAr")}
          maxLength={100_000}
          name="bodyAr"
        />
        <MarkdownEditor
          defaultValue={post?.body_en}
          dir="ltr"
          label={t("bodyEn")}
          maxLength={100_000}
          name="bodyEn"
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
