"use client";

import type { Tables } from "@repo/database";
import { Constants } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/fields";
import { FileUpload } from "@/components/file-upload";
import { KeyValueEditor } from "@/components/key-value-editor";
import { Panel } from "@/components/page";
import { saveProduct } from "../actions";

const { Enums } = Constants.public;

interface ProductFormProps {
  readonly categories: { id: string; label: string }[];
  readonly disabled?: boolean;
  readonly product?: Tables<"products">;
  readonly supabaseUrl: string;
}

export const ProductForm = ({
  categories,
  disabled = false,
  product,
  supabaseUrl,
}: ProductFormProps) => {
  const t = useTranslations("admin.catalog");
  const tStore = useTranslations("store");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveProduct}>
      {product ? <input name="id" type="hidden" value={product.id} /> : null}
      <fieldset className="grid gap-6" disabled={disabled}>
        <Panel title={t("products.basics")}>
          <FieldGrid>
            <TextField
              defaultValue={product?.name_ar}
              dir="rtl"
              label={t("fields.nameAr")}
              maxLength={200}
              name="nameAr"
              required
            />
            <TextField
              defaultValue={product?.name_en}
              dir="ltr"
              label={t("fields.nameEn")}
              maxLength={200}
              name="nameEn"
              required
            />
            <TextField
              defaultValue={product?.slug}
              dir="ltr"
              hint={t("fields.slugHint")}
              label={t("fields.slug")}
              maxLength={120}
              name="slug"
              required
            />
            <SelectField
              defaultValue={product?.category_id ?? ""}
              label={t("fields.category")}
              name="categoryId"
              options={[
                { label: tCommon("none"), value: "" },
                ...categories.map((category) => ({
                  label: category.label,
                  value: category.id,
                })),
              ]}
            />
            <SelectField
              defaultValue={product?.kind ?? "sale"}
              hint={t("fields.kindHint")}
              label={t("fields.kind")}
              name="kind"
              options={Enums.product_kind.map((value) => ({
                label: tStore(`kind.${value}`),
                value,
              }))}
            />
            <SelectField
              defaultValue={product?.status ?? "draft"}
              hint={t("fields.statusHint")}
              label={t("fields.status")}
              name="status"
              options={Enums.product_status.map((value) => ({
                label: t(`productStatus.${value}`),
                value,
              }))}
            />
          </FieldGrid>
          <CheckboxField
            defaultChecked={product?.featured ?? false}
            hint={t("fields.featuredHint")}
            label={t("fields.featured")}
            name="featured"
          />
        </Panel>

        <Panel title={t("products.pricing")}>
          <FieldGrid columns={4}>
            <TextField
              defaultValue={product?.price ?? ""}
              dir="ltr"
              hint={t("fields.priceHint")}
              inputMode="numeric"
              label={t("fields.price")}
              name="price"
              required
            />
            <TextField
              defaultValue={product?.compare_at_price ?? ""}
              dir="ltr"
              hint={t("fields.compareAtHint")}
              inputMode="numeric"
              label={t("fields.compareAt")}
              name="compareAtPrice"
            />
            <TextField
              defaultValue={product?.stock_count ?? 0}
              dir="ltr"
              hint={t("fields.stockHint")}
              inputMode="numeric"
              label={t("fields.stock")}
              name="stock"
              required
            />
            <SelectField
              defaultValue={product?.condition ?? "new"}
              label={t("fields.condition")}
              name="condition"
              options={Enums.product_condition.map((value) => ({
                label: tStore(`condition.${value}`),
                value,
              }))}
            />
          </FieldGrid>
        </Panel>

        <Panel title={t("products.content")}>
          <FieldGrid>
            <TextareaField
              defaultValue={product?.description_ar ?? ""}
              dir="rtl"
              label={t("fields.descriptionAr")}
              maxLength={10_000}
              name="descriptionAr"
              rows={6}
            />
            <TextareaField
              defaultValue={product?.description_en ?? ""}
              dir="ltr"
              label={t("fields.descriptionEn")}
              maxLength={10_000}
              name="descriptionEn"
              rows={6}
            />
          </FieldGrid>
          <FileUpload
            accept="image"
            bucket="catalog"
            defaultPaths={product?.images ?? []}
            folder="products"
            label={t("fields.images")}
            max={12}
            name="images"
            supabaseUrl={supabaseUrl}
          />
          <KeyValueEditor
            defaultValue={
              (product?.details as Record<string, unknown> | undefined) ?? null
            }
            label={t("fields.details")}
            prefix="detail"
          />
        </Panel>

        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
