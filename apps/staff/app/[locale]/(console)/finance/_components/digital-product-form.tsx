"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextField } from "@/components/admin/fields";
import { setDigitalProduct } from "../actions";

/** A denomination's margin and whether it's on sale. */
export const DigitalProductForm = ({
  active,
  id,
  margin,
}: {
  readonly active: boolean;
  readonly id: string;
  readonly margin: number | null;
}) => {
  const t = useTranslations("admin.finance.codes");
  return (
    <ActionForm
      action={setDigitalProduct}
      className="flex flex-wrap items-end gap-3"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        defaultValue={margin === null ? "" : String(margin)}
        inputMode="decimal"
        label={t("margin")}
        name="margin"
        placeholder={t("marginDefault")}
        wrapperClassName="w-36"
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
