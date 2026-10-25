"use client";

import { localized } from "@repo/commerce";
import type { Enums } from "@repo/database";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, TextField } from "@/components/admin/fields";
import { saveBulbRates } from "../actions";

interface BulbRatesFormProps {
  readonly categories: {
    bulb_multiplier: number;
    id: string;
    name_ar: string;
    name_en: string;
  }[];
  readonly disabled: boolean;
  readonly plusBonus: number;
  readonly tiers: {
    free_delivery_from: number | null;
    min_spend: number;
    rate: number;
    tier: Enums<"bulb_tier">;
  }[];
}

/** Each tier's spend and cashback, the Plus bonus and category multipliers. */
export const BulbRatesForm = ({
  categories,
  disabled,
  plusBonus,
  tiers,
}: BulbRatesFormProps) => {
  const t = useTranslations("admin.finance.bulbs");
  const tTier = useTranslations("app.bulbs.tiers");
  const tCommon = useTranslations("admin.common");
  const locale = useLocale() as Locale;

  return (
    <ActionForm action={saveBulbRates}>
      <fieldset className="grid gap-6" disabled={disabled}>
        {tiers.map((tier) => (
          <FieldGrid columns={3} key={tier.tier}>
            <TextField
              defaultValue={tier.min_spend}
              dir="ltr"
              hint={tier.tier === "glow" ? t("glowHint") : undefined}
              inputMode="numeric"
              label={t("minSpend", { tier: tTier(`${tier.tier}.name`) })}
              name={`${tier.tier}Min`}
              readOnly={tier.tier === "glow"}
            />
            <TextField
              defaultValue={tier.rate}
              dir="ltr"
              inputMode="decimal"
              label={t("rate", { tier: tTier(`${tier.tier}.name`) })}
              name={`${tier.tier}Rate`}
            />
            <TextField
              defaultValue={tier.free_delivery_from ?? ""}
              dir="ltr"
              hint={t("freeDeliveryHint")}
              inputMode="numeric"
              label={t("freeDelivery", { tier: tTier(`${tier.tier}.name`) })}
              name={`${tier.tier}FreeDelivery`}
            />
          </FieldGrid>
        ))}
        <TextField
          defaultValue={plusBonus}
          dir="ltr"
          hint={t("plusBonusHint")}
          inputMode="decimal"
          label={t("plusBonus")}
          name="plusBonus"
          wrapperClassName="max-w-xs"
        />
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
