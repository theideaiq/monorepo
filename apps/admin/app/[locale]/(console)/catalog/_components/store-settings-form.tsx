"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { FieldGrid, TextField } from "@/components/fields";
import { saveStoreSettings } from "../actions";

export const StoreSettingsForm = ({
  disabled,
  freeShippingThreshold,
  shippingFee,
}: {
  readonly disabled: boolean;
  readonly freeShippingThreshold: number | null;
  readonly shippingFee: number;
}) => {
  const t = useTranslations("admin.catalog.settings");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveStoreSettings}>
      <fieldset className="grid gap-4" disabled={disabled}>
        <FieldGrid>
          <TextField
            defaultValue={shippingFee}
            dir="ltr"
            hint={t("shippingFeeHint")}
            inputMode="numeric"
            label={t("shippingFee")}
            name="shippingFee"
          />
          <TextField
            defaultValue={freeShippingThreshold ?? ""}
            dir="ltr"
            hint={t("thresholdHint")}
            inputMode="numeric"
            label={t("threshold")}
            name="freeShippingThreshold"
          />
        </FieldGrid>
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
