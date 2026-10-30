"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextField } from "@/components/admin/fields";
import { setDigitalBrand } from "../actions";

/** A brand's Arabic names and whether it's on sale. */
export const DigitalBrandForm = ({
  active,
  id,
  nameAr,
  regionAr,
}: {
  readonly active: boolean;
  readonly id: string;
  readonly nameAr: string;
  readonly regionAr: string;
}) => {
  const t = useTranslations("admin.finance.codes");
  return (
    <ActionForm
      action={setDigitalBrand}
      className="flex flex-wrap items-end gap-3"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        defaultValue={nameAr}
        dir="rtl"
        label={t("nameAr")}
        name="nameAr"
        wrapperClassName="w-48"
      />
      <TextField
        defaultValue={regionAr}
        dir="rtl"
        label={t("regionAr")}
        name="regionAr"
        wrapperClassName="w-40"
      />
      <CheckboxField
        defaultChecked={active}
        label={t("onSale")}
        name="active"
      />
      <SubmitButton size="sm" variant="outline">
        {t("save")}
      </SubmitButton>
    </ActionForm>
  );
};
