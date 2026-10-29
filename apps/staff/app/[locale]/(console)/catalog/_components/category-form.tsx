"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { deleteCategory, saveCategory } from "../actions";

interface CategoryFormProps {
  readonly category?: Tables<"product_categories">;
  readonly disabled?: boolean;
  /** Top-level categories this one can sit under (one level only). */
  readonly parents: { id: string; label: string }[];
}

export const CategoryForm = ({
  category,
  disabled = false,
  parents,
}: CategoryFormProps) => {
  const t = useTranslations("admin.catalog");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <ActionForm
        action={saveCategory}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {category ? (
          <input name="id" type="hidden" value={category.id} />
        ) : null}
        <TextField
          defaultValue={category?.name_ar}
          dir="rtl"
          disabled={disabled}
          label={t("fields.nameAr")}
          name="nameAr"
          wrapperClassName="min-w-40 flex-1"
        />
        <TextField
          defaultValue={category?.name_en}
          dir="ltr"
          disabled={disabled}
          label={t("fields.nameEn")}
          name="nameEn"
          wrapperClassName="min-w-40 flex-1"
        />
        <TextField
          defaultValue={category?.slug}
          dir="ltr"
          disabled={disabled}
          label={t("fields.slug")}
          name="slug"
          wrapperClassName="w-40"
        />
        <SelectField
          defaultValue={category?.parent_id ?? ""}
          disabled={disabled}
          label={t("fields.parent")}
          name="parentId"
          options={[
            { label: t("categories.topLevel"), value: "" },
            ...parents
              .filter((parent) => parent.id !== category?.id)
              .map((parent) => ({ label: parent.label, value: parent.id })),
          ]}
          wrapperClassName="w-44"
        />
        <TextField
          defaultValue={category?.position ?? 0}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={tCommon("position")}
          name="position"
          wrapperClassName="w-20"
        />
        <CheckboxField
          defaultChecked={category?.auctions ?? false}
          disabled={disabled}
          label={t("fields.auctions")}
          name="auctions"
        />
        {disabled ? null : (
          <SubmitButton variant={category ? "secondary" : "default"}>
            {category ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {category && !disabled ? (
        <ActionButton
          action={deleteCategory}
          confirm={{
            description: t("categories.deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: category.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
