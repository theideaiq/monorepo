"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { saveStoreSettings } from "../actions";

export interface StoreSettingsValues {
  cash_on_delivery_enabled: boolean;
  pickup_address_ar: string | null;
  pickup_address_en: string | null;
  pickup_enabled: boolean;
  pickup_hours_ar: string | null;
  pickup_hours_en: string | null;
  require_verified_phone: boolean;
  shipping_fee: number;
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
        <div className="grid gap-4 rounded-md border p-4">
          <div className="grid gap-1">
            <p className="font-medium text-sm">{t("pickup.title")}</p>
            <p className="text-muted-foreground text-xs">
              {t("pickup.description")}
            </p>
          </div>
          <CheckboxField
            defaultChecked={settings.pickup_enabled}
            label={t("pickup.enabled")}
            name="pickupEnabled"
          />
          <FieldGrid>
            <TextareaField
              defaultValue={settings.pickup_address_ar ?? ""}
              dir="rtl"
              label={t("pickup.addressAr")}
              maxLength={500}
              name="pickupAddressAr"
              rows={3}
            />
            <TextareaField
              defaultValue={settings.pickup_address_en ?? ""}
              dir="ltr"
              label={t("pickup.addressEn")}
              maxLength={500}
              name="pickupAddressEn"
              rows={3}
            />
            <TextField
              defaultValue={settings.pickup_hours_ar ?? ""}
              dir="rtl"
              label={t("pickup.hoursAr")}
              maxLength={200}
              name="pickupHoursAr"
            />
            <TextField
              defaultValue={settings.pickup_hours_en ?? ""}
              dir="ltr"
              label={t("pickup.hoursEn")}
              maxLength={200}
              name="pickupHoursEn"
            />
          </FieldGrid>
        </div>
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
