"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, FieldGrid, TextField } from "@/components/admin/fields";
import { saveStoreSettings } from "../actions";

export interface StoreSettingsValues {
  cash_on_delivery_enabled: boolean;
  require_verified_phone: boolean;
  shipping_fee: number;
  survey_daily_boosted: number;
  survey_early_hours: number;
  survey_early_share: number;
  survey_trusted_answers: number;
  survey_trusted_window: number;
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
        <fieldset className="grid gap-3 border-t pt-4">
          <legend className="font-medium text-sm">{t("surveys.title")}</legend>
          <p className="text-muted-foreground text-xs">{t("surveys.hint")}</p>
          <FieldGrid>
            <TextField
              defaultValue={settings.survey_trusted_answers}
              dir="ltr"
              inputMode="numeric"
              label={t("surveys.surveyTrustedAnswers")}
              name="surveyTrustedAnswers"
            />
            <TextField
              defaultValue={settings.survey_trusted_window}
              dir="ltr"
              inputMode="numeric"
              label={t("surveys.surveyTrustedWindow")}
              name="surveyTrustedWindow"
            />
            <TextField
              defaultValue={settings.survey_early_hours}
              dir="ltr"
              inputMode="numeric"
              label={t("surveys.surveyEarlyHours")}
              name="surveyEarlyHours"
            />
            <TextField
              defaultValue={settings.survey_early_share}
              dir="ltr"
              inputMode="numeric"
              label={t("surveys.surveyEarlyShare")}
              name="surveyEarlyShare"
            />
            <TextField
              defaultValue={settings.survey_daily_boosted}
              dir="ltr"
              inputMode="numeric"
              label={t("surveys.surveyDailyBoosted")}
              name="surveyDailyBoosted"
            />
          </FieldGrid>
        </fieldset>
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
