"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { FieldGrid, TextField } from "@/components/fields";
import { KeyValueEditor } from "@/components/key-value-editor";
import { deleteVariant, saveVariant } from "../actions";

interface VariantFormProps {
  readonly disabled?: boolean;
  readonly productId: string;
  readonly variant?: Tables<"product_variants">;
}

/** One variant (e.g. "Color: Black · Storage: 1 TB") or the "add" form. */
export const VariantForm = ({
  disabled = false,
  productId,
  variant,
}: VariantFormProps) => {
  const t = useTranslations("admin.catalog");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <ActionForm action={saveVariant} resetOnSuccess={!variant}>
        <input name="productId" type="hidden" value={productId} />
        {variant ? <input name="id" type="hidden" value={variant.id} /> : null}
        <fieldset className="grid gap-3" disabled={disabled}>
          <KeyValueEditor
            defaultValue={variant?.attributes as Record<string, unknown>}
            label={t("variants.attributes")}
            prefix="attr"
          />
          <FieldGrid columns={4}>
            <TextField
              defaultValue={variant?.sku ?? ""}
              dir="ltr"
              label={t("variants.sku")}
              maxLength={64}
              name="sku"
            />
            <TextField
              defaultValue={variant?.price_override ?? ""}
              dir="ltr"
              hint={t("variants.priceHint")}
              inputMode="numeric"
              label={t("variants.price")}
              name="priceOverride"
            />
            <TextField
              defaultValue={variant?.stock_count ?? 0}
              dir="ltr"
              inputMode="numeric"
              label={t("fields.stock")}
              name="stock"
            />
            <TextField
              defaultValue={variant?.position ?? 0}
              dir="ltr"
              inputMode="numeric"
              label={tCommon("position")}
              name="position"
            />
          </FieldGrid>
          {disabled ? null : (
            <div className="flex justify-end gap-2">
              <SubmitButton size="sm" variant={variant ? "secondary" : "default"}>
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
