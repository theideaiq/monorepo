"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { saveMoneyRules } from "../actions";

export interface MoneyRules {
  bulb_rate: number;
  cash_limit: number | null;
  delivery_cost: number;
  max_giveaway_rate: number;
  min_margin_rate: number;
  payment_fee_rate: number;
  return_days: number;
}

interface MoneyRulesFormProps {
  readonly disabled: boolean;
  readonly rules: MoneyRules;
}

/**
 * The money rules: the Bulbs rate, the return window,
 * the giveaway cap and cash limit, and what the price check counts.
 */
export const MoneyRulesForm = ({ disabled, rules }: MoneyRulesFormProps) => {
  const t = useTranslations("admin.finance.rules");
  const tCommon = useTranslations("admin.common");

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
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
