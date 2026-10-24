"use client";

import type { Tables } from "@repo/database";
import { Constants } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { saveAccount } from "../actions";

export const AccountForm = ({
  account,
  disabled = false,
}: {
  readonly account?: Tables<"chart_of_accounts">;
  readonly disabled?: boolean;
}) => {
  const t = useTranslations("admin.finance.accounts");
  const tCommon = useTranslations("admin.common");

  return (
    <ActionForm
      action={saveAccount}
      className="flex flex-wrap items-end gap-3 rounded-md border p-3"
    >
      {account ? <input name="id" type="hidden" value={account.id} /> : null}
      <TextField
        defaultValue={account?.code}
        dir="ltr"
        disabled={disabled}
        inputMode="numeric"
        label={t("code")}
        maxLength={6}
        name="code"
        wrapperClassName="w-24"
      />
      <TextField
        defaultValue={account?.name}
        disabled={disabled}
        label={t("name")}
        maxLength={120}
        name="name"
        wrapperClassName="min-w-48 flex-1"
      />
      <SelectField
        defaultValue={account?.type ?? "expense"}
        disabled={disabled}
        label={t("type")}
        name="type"
        options={Constants.public.Enums.account_type.map((value) => ({
          label: t(`types.${value}`),
          value,
        }))}
        wrapperClassName="w-36"
      />
      <TextField
        defaultValue={account?.category ?? ""}
        dir="ltr"
        disabled={disabled}
        hint={t("categoryHint")}
        label={t("category")}
        maxLength={60}
        name="category"
        wrapperClassName="w-36"
      />
      <CheckboxField
        className="pb-2"
        defaultChecked={account?.active ?? true}
        disabled={disabled}
        label={t("active")}
        name="active"
      />
      {disabled ? null : (
        <SubmitButton variant={account ? "secondary" : "default"}>
          {account ? tCommon("save") : tCommon("add")}
        </SubmitButton>
      )}
    </ActionForm>
  );
};
