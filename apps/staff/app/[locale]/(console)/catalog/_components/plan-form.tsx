"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import { savePlan } from "../actions";

interface PlanFormProps {
  readonly disabled?: boolean;
  readonly plan?: Tables<"plans">;
}

/** Plus plans and Partners business plans. */
export const PlanForm = ({ disabled = false, plan }: PlanFormProps) => {
  const t = useTranslations("admin.catalog.plans");
  const tCommon = useTranslations("admin.common");
  const [audience, setAudience] = useState(plan?.audience ?? "plus");

  return (
    <ActionForm action={savePlan}>
      {plan ? (
        <input name="id" type="hidden" value={plan.id} />
      ) : (
        <input name="isNew" type="hidden" value="true" />
      )}
      <fieldset className="grid gap-6" disabled={disabled}>
        <Panel>
          <FieldGrid>
            {plan ? null : (
              <TextField
                dir="ltr"
                hint={t("idHint")}
                label={t("id")}
                maxLength={64}
                name="id"
                required
              />
            )}
            <TextField
              defaultValue={plan?.name}
              label={t("name")}
              maxLength={120}
              name="name"
              required
            />
            <TextField
              defaultValue={plan?.name_ar ?? ""}
              dir="rtl"
              hint={t("nameArHint")}
              label={t("nameAr")}
              maxLength={120}
              name="nameAr"
            />
            <SelectField
              label={t("audience")}
              name="audience"
              onChange={(event) => setAudience(event.target.value)}
              options={[
                { label: t("audiences.plus"), value: "plus" },
                { label: t("audiences.business"), value: "business" },
              ]}
              value={audience}
            />
            <TextField
              defaultValue={plan?.amount ?? ""}
              dir="ltr"
              hint={t("amountHint")}
              inputMode="numeric"
              label={t("amount")}
              name="amount"
              required
            />
            <SelectField
              defaultValue={plan?.billing_interval ?? "month"}
              label={t("interval")}
              name="billingInterval"
              options={[
                { label: t("intervals.month"), value: "month" },
                { label: t("intervals.year"), value: "year" },
              ]}
            />
            {audience === "plus" ? (
              <TextField
                defaultValue={plan?.rental_slots ?? 1}
                dir="ltr"
                hint={t("slotsHint")}
                inputMode="numeric"
                label={t("slots")}
                name="rentalSlots"
              />
            ) : null}
            {audience === "plus" ? (
              <TextField
                defaultValue={plan?.bulb_rate ?? ""}
                dir="ltr"
                hint={t("bulbRateHint")}
                inputMode="decimal"
                label={t("bulbRate")}
                name="bulbRate"
              />
            ) : null}
            {audience === "plus" ? (
              <TextField
                defaultValue={plan?.tier ?? ""}
                dir="ltr"
                hint={t("tierHint")}
                inputMode="numeric"
                label={t("tier")}
                name="tier"
                required
              />
            ) : null}
            <TextField
              defaultValue={plan?.position ?? 0}
              dir="ltr"
              hint={tCommon("positionHint")}
              inputMode="numeric"
              label={tCommon("position")}
              name="position"
            />
          </FieldGrid>
          <TextareaField
            defaultValue={plan?.description ?? ""}
            label={t("description")}
            maxLength={500}
            name="description"
            rows={2}
          />
          <FieldGrid>
            <TextareaField
              defaultValue={(plan?.features_ar ?? []).join("\n")}
              dir="rtl"
              hint={t("featuresHint")}
              label={t("featuresAr")}
              name="featuresAr"
              rows={6}
            />
            <TextareaField
              defaultValue={(plan?.features_en ?? []).join("\n")}
              dir="ltr"
              hint={t("featuresHint")}
              label={t("featuresEn")}
              name="featuresEn"
              rows={6}
            />
          </FieldGrid>
          {audience === "plus" ? (
            <CheckboxField
              defaultChecked={plan?.free_delivery ?? false}
              hint={t("freeDeliveryHint")}
              label={t("freeDelivery")}
              name="freeDelivery"
            />
          ) : null}
          <CheckboxField
            defaultChecked={plan?.active ?? true}
            hint={t("activeHint")}
            label={t("active")}
            name="active"
          />
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
