"use client";

import { localized } from "@repo/commerce";
import type { Locale } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { decideAffiliate, recordPayout, saveAffiliateRates } from "./actions";

/** Marketing approves (with the code), rejects or suspends. */
export const DecideAffiliateForm = ({
  code,
  note,
  status,
  userId,
}: {
  readonly code: string;
  readonly note: string | null;
  readonly status: string;
  readonly userId: string;
}) => {
  const t = useTranslations("admin.affiliates");
  const decisions = ["approved", "rejected", "suspended"] as const;
  return (
    <ActionForm action={decideAffiliate}>
      <input name="userId" type="hidden" value={userId} />
      <TextField
        defaultValue={code}
        dir="ltr"
        hint={t("codeHint")}
        label={t("code")}
        maxLength={20}
        name="code"
      />
      <SelectField
        defaultValue={status === "applied" ? "approved" : status}
        label={t("decision")}
        name="decision"
        options={decisions.map((value) => ({
          label: t(`decisions.${value}`),
          value,
        }))}
      />
      <TextareaField
        defaultValue={note ?? ""}
        hint={t("noteHint")}
        label={t("note")}
        maxLength={1000}
        name="note"
        rows={3}
      />
      <SubmitButton className="w-fit">{t("saveDecision")}</SubmitButton>
    </ActionForm>
  );
};

/** Finance records the transfer of everything ready to pay. */
export const RecordPayoutForm = ({
  bulbs,
  userId,
}: {
  /** Paid as Bulbs: no transfer reference. */
  readonly bulbs: boolean;
  readonly userId: string;
}) => {
  const t = useTranslations("admin.affiliates");
  return (
    <ActionForm action={recordPayout} className="border-t pt-4">
      <input name="userId" type="hidden" value={userId} />
      {bulbs ? (
        <p className="text-muted-foreground text-sm">{t("payBulbsHint")}</p>
      ) : (
        <TextField
          dir="ltr"
          hint={t("referenceHint")}
          label={t("reference")}
          maxLength={200}
          name="reference"
          required
        />
      )}
      <SubmitButton className="w-fit">{t("recordPayout")}</SubmitButton>
    </ActionForm>
  );
};

/** Each category's commission rate, in percent. */
export const AffiliateRatesForm = ({
  categories,
  disabled,
}: {
  readonly categories: {
    affiliate_rate: number;
    id: string;
    name_ar: string;
    name_en: string;
  }[];
  readonly disabled: boolean;
}) => {
  const tCommon = useTranslations("admin.common");
  const locale = useLocale() as Locale;
  return (
    <ActionForm action={saveAffiliateRates}>
      <fieldset className="grid gap-6" disabled={disabled}>
        <FieldGrid columns={3}>
          {categories.map((category) => (
            <TextField
              defaultValue={category.affiliate_rate}
              dir="ltr"
              inputMode="decimal"
              key={category.id}
              label={localized(category, "name", locale)}
              name={`rate:${category.id}`}
            />
          ))}
        </FieldGrid>
        {disabled ? null : (
          <div className="flex justify-end">
            <SubmitButton>{tCommon("save")}</SubmitButton>
          </div>
        )}
      </fieldset>
    </ActionForm>
  );
};
