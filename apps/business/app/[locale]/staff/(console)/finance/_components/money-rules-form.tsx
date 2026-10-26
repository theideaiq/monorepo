"use client";

import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { saveMoneyRules } from "../actions";

export interface MoneyRules {
  bulb_half_from: number;
  bulb_rate: number;
  cash_limit: number | null;
  delivery_cost: number;
  max_giveaway_rate: number;
  min_margin_rate: number;
  payment_fee_rate: number;
  return_days: number;
}

interface MoneyRulesFormProps {
  readonly categories: {
    bulb_multiplier: number;
    id: string;
    name_ar: string;
    name_en: string;
  }[];
  readonly disabled: boolean;
  readonly rules: MoneyRules;
}

/**
 * The money rules: Bulbs (rate, half rate, multipliers), the return window,
 * the giveaway cap and cash limit, and what the price check counts.
 */
export const MoneyRulesForm = ({
  categories,
  disabled,
  rules,
}: MoneyRulesFormProps) => {
  const t = useTranslations("admin.finance.rules");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale() as Locale;

  return (
    <ActionForm action={saveMoneyRules}>
      <fieldset className="grid gap-6" disabled={disabled}>
        <FieldGrid columns={3}>
          <TextField
            defaultValue={rules.bulb_rate}
            dir="ltr"
            hint={t("bulbRateHint")}
            inputMode="decimal"
            label={t("bulbRate")}
            name="bulbRate"
          />
          <TextField
            defaultValue={rules.bulb_half_from}
            dir="ltr"
            hint={t("bulbHalfFromHint")}
            inputMode="numeric"
            label={t("bulbHalfFrom")}
            name="bulbHalfFrom"
          />
          <TextField
            defaultValue={rules.return_days}
            dir="ltr"
            hint={t("returnDaysHint")}
            inputMode="numeric"
            label={t("returnDays")}
            name="returnDays"
          />
          <TextField
            defaultValue={rules.max_giveaway_rate}
            dir="ltr"
            hint={t("maxGiveawayRateHint")}
            inputMode="decimal"
            label={t("maxGiveawayRate")}
            name="maxGiveawayRate"
          />
          <TextField
            defaultValue={rules.cash_limit ?? ""}
            dir="ltr"
            hint={t("cashLimitHint")}
            inputMode="numeric"
            label={t("cashLimit")}
            name="cashLimit"
          />
        </FieldGrid>
        <div className="grid gap-3">
          <p className="font-medium text-sm">{t("priceCheck")}</p>
          <p className="text-muted-foreground text-sm">{t("priceCheckHint")}</p>
          <FieldGrid columns={3}>
            <TextField
              defaultValue={rules.payment_fee_rate}
              dir="ltr"
              inputMode="decimal"
              label={t("paymentFeeRate")}
              name="paymentFeeRate"
            />
            <TextField
              defaultValue={rules.delivery_cost}
              dir="ltr"
              inputMode="numeric"
              label={t("deliveryCost")}
              name="deliveryCost"
            />
            <TextField
              defaultValue={rules.min_margin_rate}
              dir="ltr"
              inputMode="decimal"
              label={t("minMarginRate")}
              name="minMarginRate"
            />
          </FieldGrid>
        </div>
        <div className="grid gap-3">
          <p className="font-medium text-sm">{t("multipliers")}</p>
          <p className="text-muted-foreground text-sm">
            {t("multipliersHint")}
          </p>
          <FieldGrid columns={3}>
            {categories.map((category) => (
              <TextField
                defaultValue={category.bulb_multiplier}
                dir="ltr"
                inputMode="decimal"
                key={category.id}
                label={localized(category, "name", locale)}
                name={`multiplier:${category.id}`}
              />
            ))}
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
