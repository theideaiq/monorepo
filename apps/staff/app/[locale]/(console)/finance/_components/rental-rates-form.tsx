"use client";

import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, FieldGrid, TextField } from "@/components/admin/fields";
import { saveRentalRates } from "../actions";

export interface RentalRateRow {
  days: number | null;
  id: string;
  late_fee: number | null;
  name_ar: string;
  name_en: string;
  /** The price is for the rest of the current term (textbooks). */
  per_term: boolean;
  /** Null when the category isn't rented on its own. */
  price: number | null;
}

interface RentalRatesFormProps {
  readonly categories: RentalRateRow[];
  readonly depositRate: number;
  readonly disabled: boolean;
}

/**
 * Single-item rent: per category, the price for so many days and the fee
 * per day late; and the refundable deposit for every item.
 */
export const RentalRatesForm = ({
  categories,
  depositRate,
  disabled,
}: RentalRatesFormProps) => {
  const t = useTranslations("admin.finance.rentals");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale() as Locale;

  return (
    <ActionForm action={saveRentalRates}>
      <fieldset className="grid gap-6" disabled={disabled}>
        <FieldGrid columns={3}>
          <TextField
            defaultValue={depositRate}
            dir="ltr"
            hint={t("depositRateHint")}
            inputMode="decimal"
            label={t("depositRate")}
            name="depositRate"
          />
        </FieldGrid>
        {categories.map((category) => (
          <div className="grid gap-3" key={category.id}>
            <p className="font-medium text-sm">
              {localized(category, "name", locale)}
            </p>
            <FieldGrid columns={3}>
              <TextField
                defaultValue={category.price ?? ""}
                dir="ltr"
                hint={t("priceHint")}
                inputMode="numeric"
                label={t("price")}
                name={`price:${category.id}`}
              />
              <TextField
                defaultValue={category.days ?? 7}
                dir="ltr"
                inputMode="numeric"
                label={t("days")}
                name={`days:${category.id}`}
              />
              <TextField
                defaultValue={category.late_fee ?? 0}
                dir="ltr"
                inputMode="numeric"
                label={t("lateFee")}
                name={`lateFee:${category.id}`}
              />
            </FieldGrid>
            <CheckboxField
              defaultChecked={category.per_term}
              hint={t("perTermHint")}
              label={t("perTerm")}
              name={`perTerm:${category.id}`}
            />
          </div>
        ))}
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
