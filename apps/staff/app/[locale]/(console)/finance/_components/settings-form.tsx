"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { saveFinancialSettings } from "../actions";

/** Fiscal year, tax rates and the base currency of the books. */
export const SettingsForm = ({
  disabled,
  months,
  settings,
}: {
  readonly disabled: boolean;
  /** Month names in the viewer's language, January first. */
  readonly months: string[];
  readonly settings: Tables<"financial_settings"> | null;
}) => {
  const t = useTranslations("admin.finance.settings");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm action={saveFinancialSettings}>
      <fieldset className="grid gap-6" disabled={disabled}>
        <Panel>
          <FieldGrid>
            <SelectField
              defaultValue={String(settings?.fiscal_year_start_month ?? 1)}
              hint={t("fiscalYearHint")}
              label={t("fiscalYear")}
              name="fiscalYearStartMonth"
              options={months.map((label, index) => ({
                label,
                value: String(index + 1),
              }))}
            />
            <TextField
              defaultValue={settings?.base_currency ?? "IQD"}
              dir="ltr"
              hint={t("baseCurrencyHint")}
              label={t("baseCurrency")}
              maxLength={3}
              name="baseCurrency"
              required
            />
            <TextField
              defaultValue={settings?.corporate_tax_rate ?? 15}
              dir="ltr"
              hint={t("taxHint")}
              inputMode="decimal"
              label={t("corporateTax")}
              name="corporateTaxRate"
              required
            />
            <TextField
              defaultValue={settings?.vat_rate ?? 0}
              dir="ltr"
              hint={t("vatHint")}
              inputMode="decimal"
              label={t("vat")}
              name="vatRate"
              required
            />
          </FieldGrid>
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
