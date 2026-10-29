"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { FieldGrid, SelectField, TextField } from "@/components/admin/fields";
import { createCoupon } from "../actions";

/** A new coupon code; dates are Baghdad time, empty limits mean none. */
export const CouponForm = () => {
  const t = useTranslations("admin.finance.coupons");
  return (
    <ActionForm action={createCoupon} className="grid gap-4" resetOnSuccess>
      <FieldGrid>
        <TextField
          className="uppercase"
          dir="ltr"
          hint={t("codeHint")}
          label={t("code")}
          maxLength={24}
          name="code"
          required
        />
        <SelectField
          label={t("kind")}
          name="kind"
          options={[
            { label: t("kindPercent"), value: "percent" },
            { label: t("kindAmount"), value: "amount" },
          ]}
        />
        <TextField
          hint={t("amountHint")}
          inputMode="numeric"
          label={t("amount")}
          name="amount"
          required
        />
        <TextField
          hint={t("maxDiscountHint")}
          inputMode="numeric"
          label={t("maxDiscount")}
          name="maxDiscount"
        />
        <TextField
          inputMode="numeric"
          label={t("minSubtotal")}
          name="minSubtotal"
        />
        <TextField
          hint={t("timeHint")}
          label={t("startsAt")}
          name="startsAt"
          type="datetime-local"
        />
        <TextField label={t("endsAt")} name="endsAt" type="datetime-local" />
        <TextField
          hint={t("maxUsesHint")}
          inputMode="numeric"
          label={t("maxUses")}
          name="maxUses"
        />
        <TextField
          defaultValue="1"
          inputMode="numeric"
          label={t("usesPerMember")}
          name="usesPerMember"
          required
        />
      </FieldGrid>
      <TextField
        label={t("descriptionField")}
        maxLength={300}
        name="description"
      />
      <div>
        <SubmitButton>{t("create")}</SubmitButton>
      </div>
    </ActionForm>
  );
};
