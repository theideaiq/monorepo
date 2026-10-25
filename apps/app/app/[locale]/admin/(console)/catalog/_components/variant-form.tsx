"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, FieldGrid, TextField } from "@/components/admin/fields";
import { KeyValueEditor } from "@/components/admin/key-value-editor";
import { deleteVariant, saveVariant } from "../actions";

interface VariantFormProps {
  readonly disabled?: boolean;
  readonly productId: string;
  readonly variant?: Tables<"product_variants">;
}

/** One variant (e.g. "Vinyl", "PS5", "Black") or the "add" form. */
export const VariantForm = ({
  disabled = false,
  productId,
  variant,
}: VariantFormProps) => {
  const t = useTranslations("admin.catalog");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="grid gap-3 rounded-md border p-3">
      <ActionForm action={saveVariant} resetOnSuccess={!variant}>
        <input name="productId" type="hidden" value={productId} />
        {variant ? <input name="id" type="hidden" value={variant.id} /> : null}
        <fieldset className="grid gap-3" disabled={disabled}>
          <FieldGrid columns={2}>
            <TextField
              defaultValue={variant?.label_en ?? ""}
              hint={t("variants.labelHint")}
              label={t("variants.labelEn")}
              maxLength={60}
              name="labelEn"
            />
            <TextField
              defaultValue={variant?.label_ar ?? ""}
              dir="rtl"
              label={t("variants.labelAr")}
              maxLength={60}
              name="labelAr"
            />
          </FieldGrid>
          <KeyValueEditor
            defaultValue={variant?.attributes as Record<string, unknown>}
            label={t("variants.attributes")}
            prefix="attr"
          />
          <FieldGrid columns={4}>
            <TextField
              defaultValue={variant?.price ?? ""}
              dir="ltr"
              inputMode="numeric"
              label={t("variants.price")}
              name="price"
              required
            />
            <TextField
              defaultValue={variant?.compare_at_price ?? ""}
              dir="ltr"
              inputMode="numeric"
              label={t("variants.compareAtPrice")}
              name="compareAtPrice"
            />
            <TextField
              defaultValue={variant?.stock_count ?? 0}
              dir="ltr"
              inputMode="numeric"
              label={t("fields.stock")}
              name="stock"
            />
            <TextField
              defaultValue={variant?.rental_stock ?? 0}
              dir="ltr"
              inputMode="numeric"
              label={t("variants.rentalStock")}
              name="rentalStock"
            />
            <TextField
              defaultValue={variant?.sku ?? ""}
              dir="ltr"
              label={t("variants.sku")}
              maxLength={64}
              name="sku"
            />
            <TextField
              defaultValue={variant?.barcode ?? ""}
              dir="ltr"
              inputMode="numeric"
              label={t("variants.barcode")}
              maxLength={64}
              name="barcode"
            />
            <TextField
              defaultValue={variant?.position ?? 0}
              dir="ltr"
              inputMode="numeric"
              label={tCommon("position")}
              name="position"
            />
          </FieldGrid>
          <CheckboxField
            defaultChecked={variant?.active ?? true}
            label={t("variants.active")}
            name="active"
          />
          {disabled ? null : (
            <div className="flex justify-end gap-2">
              <SubmitButton
                size="sm"
                variant={variant ? "secondary" : "default"}
              >
                {variant ? tCommon("save") : t("variants.add")}
              </SubmitButton>
            </div>
          )}
        </fieldset>
      </ActionForm>
      {variant && !disabled ? (
        <div className="flex justify-end">
          <ActionButton
            action={deleteVariant}
            confirm={{ title: tCommon("deleteConfirm") }}
            fields={{ id: variant.id }}
            variant="ghost"
          >
            {tCommon("delete")}
          </ActionButton>
        </div>
      ) : null}
    </div>
  );
};
