"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField, TextField } from "@/components/admin/fields";
import {
  decideAffiliate,
  recordAffiliatePayout,
  setAffiliateRate,
} from "./actions";

/** Approve (with a code), refuse or suspend, with a note for them. */
export const DecideForm = ({
  code,
  org,
  status,
}: {
  readonly code: string | null;
  readonly org: string;
  readonly status: string;
}) => {
  const t = useTranslations("admin.affiliates");
  const decisions: readonly ("approved" | "rejected" | "suspended")[] =
    status === "approved" ? ["suspended"] : ["approved", "rejected"];
  return (
    <ActionForm
      action={decideAffiliate}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="org" type="hidden" value={org} />
      <SelectField
        label={t("decision")}
        name="decision"
        options={decisions.map((value) => ({
          label: t(`decisions.${value}`),
          value,
        }))}
        wrapperClassName="w-40"
      />
      {code ? null : (
        <TextField
          dir="ltr"
          hint={t("codeHint")}
          label={t("code")}
          maxLength={20}
          name="code"
          wrapperClassName="w-40"
        />
      )}
      <TextField
        label={t("note")}
        maxLength={1000}
        name="note"
        wrapperClassName="min-w-48 flex-1"
      />
      <SubmitButton size="sm">{t("save")}</SubmitButton>
    </ActionForm>
  );
};

/** Restores a suspended affiliate (its coupon turns back on). */
export const RestoreForm = ({ org }: { readonly org: string }) => {
  const t = useTranslations("admin.affiliates");
  return (
    <ActionForm action={decideAffiliate}>
      <input name="org" type="hidden" value={org} />
      <input name="decision" type="hidden" value="approved" />
      <SubmitButton size="sm" variant="outline">
        {t("restore")}
      </SubmitButton>
    </ActionForm>
  );
};

export const RateForm = ({
  family,
  label,
  rate,
}: {
  readonly family: string;
  readonly label: string;
  readonly rate: number;
}) => {
  const t = useTranslations("admin.affiliates");
  return (
    <ActionForm action={setAffiliateRate} className="flex items-end gap-2">
      <input name="family" type="hidden" value={family} />
      <TextField
        defaultValue={String(rate)}
        dir="ltr"
        inputMode="decimal"
        label={label}
        name="rate"
        wrapperClassName="w-32"
      />
      <SubmitButton size="sm" variant="outline">
        {t("save")}
      </SubmitButton>
    </ActionForm>
  );
};

/** The transfer was sent: its reference (the amount is what's payable). */
export const PayoutForm = ({ org }: { readonly org: string }) => {
  const t = useTranslations("admin.affiliates");
  return (
    <ActionForm
      action={recordAffiliatePayout}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="org" type="hidden" value={org} />
      <TextField
        label={t("reference")}
        maxLength={200}
        name="reference"
        required
        wrapperClassName="min-w-48 flex-1"
      />
      <SubmitButton size="sm">{t("markPaid")}</SubmitButton>
    </ActionForm>
  );
};
