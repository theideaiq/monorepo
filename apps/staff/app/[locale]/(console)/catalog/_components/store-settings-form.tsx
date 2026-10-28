"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, FieldGrid, TextField } from "@/components/admin/fields";
import { saveStoreSettings } from "../actions";

export interface StoreSettingsValues {
  cash_on_delivery_enabled: boolean;
  require_verified_phone: boolean;
  shipping_fee: number;
  wayl_return_refunds: boolean;
}

export const StoreSettingsForm = ({
  disabled,
  settings,
}: {
  readonly disabled: boolean;
  readonly settings: StoreSettingsValues;
}) => {
  const t = useTranslations("admin.catalog.settings");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveStoreSettings}>
      <fieldset className="grid gap-4" disabled={disabled}>
        <FieldGrid>
          <TextField
            defaultValue={settings.shipping_fee}
            dir="ltr"
            hint={t("shippingFeeHint")}
            inputMode="numeric"
            label={t("shippingFee")}
            name="shippingFee"
          />
        </FieldGrid>
        <CheckboxField
          defaultChecked={settings.cash_on_delivery_enabled}
          hint={t("cashOnDeliveryHint")}
          label={t("cashOnDelivery")}
          name="cashOnDelivery"
        />
        <CheckboxField
          defaultChecked={settings.require_verified_phone}
          hint={t("requireVerifiedPhoneHint")}
          label={t("requireVerifiedPhone")}
          name="requireVerifiedPhone"
        />
        <CheckboxField
          defaultChecked={settings.wayl_return_refunds}
          hint={t("waylReturnRefundsHint")}
          label={t("waylReturnRefunds")}
          name="waylReturnRefunds"
        />
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
