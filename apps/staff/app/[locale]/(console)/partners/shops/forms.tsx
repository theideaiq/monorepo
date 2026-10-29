"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import {
  decideSeller,
  saveIndividualLimit,
  saveSupplyTerms,
  setShopKind,
} from "../actions";

const DECISIONS = ["approved", "rejected", "suspended"] as const;

/** Approve, reject or suspend a shop, with a note and its deposit. */
export const DecideSellerForm = ({
  deposit,
  id,
  note,
}: {
  readonly deposit: number;
  readonly id: string;
  readonly note: string;
}) => {
  const t = useTranslations("admin.companies.shops");
  return (
    <ActionForm action={decideSeller} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <FieldGrid columns={2}>
        <SelectField
          label={t("decision")}
          name="decision"
          options={DECISIONS.map((decision) => ({
            label: t(`statuses.${decision}`),
            value: decision,
          }))}
        />
        <TextField
          defaultValue={deposit > 0 ? String(deposit) : ""}
          dir="ltr"
          hint={t("depositHint")}
          inputMode="numeric"
          label={t("deposit")}
          name="deposit"
        />
      </FieldGrid>
      <TextareaField
        defaultValue={note}
        hint={t("noteHint")}
        label={t("note")}
        maxLength={1000}
        name="note"
        rows={2}
      />
      <SubmitButton className="justify-self-start">{t("save")}</SubmitButton>
    </ActionForm>
  );
};

const KINDS = ["registered", "individual"] as const;

/** Registered (commercial registration) or individual trader. */
export const ShopKindForm = ({
  id,
  kind,
}: {
  readonly id: string;
  readonly kind: (typeof KINDS)[number] | null;
}) => {
  const t = useTranslations("admin.companies.shops");
  if (!kind) {
    return null;
  }
  return (
    <ActionForm action={setShopKind} className="flex flex-wrap items-end gap-3">
      <input name="id" type="hidden" value={id} />
      <SelectField
        defaultValue={kind}
        label={t("kind")}
        name="kind"
        options={KINDS.map((value) => ({
          label: t(`kinds.${value}`),
          value,
        }))}
      />
      <SubmitButton size="sm" variant="outline">
        {t("saveKind")}
      </SubmitButton>
    </ActionForm>
  );
};

/** Individual traders' monthly sales limit (IQD). */
export const IndividualLimitForm = ({ limit }: { readonly limit: number }) => {
  const t = useTranslations("admin.companies.shops");
  return (
    <ActionForm
      action={saveIndividualLimit}
      className="flex flex-wrap items-end gap-3"
    >
      <TextField
        defaultValue={String(limit)}
        dir="ltr"
        hint={t("limitHint")}
        inputMode="numeric"
        label={t("limit")}
        name="limit"
        required
        wrapperClassName="w-56"
      />
      <SubmitButton size="sm">{t("save")}</SubmitButton>
    </ActionForm>
  );
};

/** A supplier's fees per rental and per kit booking, paused or not. */
export const SupplyTermsForm = ({
  id,
  terms,
}: {
  readonly id: string;
  readonly terms: {
    active: boolean;
    kit_fee: number;
    note: string | null;
    rental_fee: number;
  } | null;
}) => {
  const t = useTranslations("admin.companies.shops.supply");
  return (
    <ActionForm action={saveSupplyTerms} className="grid gap-3">
      <input name="id" type="hidden" value={id} />
      <FieldGrid columns={2}>
        <TextField
          defaultValue={String(terms?.rental_fee ?? 0)}
          dir="ltr"
          hint={t("rentalFeeHint")}
          inputMode="numeric"
          label={t("rentalFee")}
          name="rentalFee"
          required
        />
        <TextField
          defaultValue={String(terms?.kit_fee ?? 0)}
          dir="ltr"
          hint={t("kitFeeHint")}
          inputMode="numeric"
          label={t("kitFee")}
          name="kitFee"
          required
        />
      </FieldGrid>
      <TextareaField
        defaultValue={terms?.note ?? ""}
        hint={t("noteHint")}
        label={t("note")}
        maxLength={1000}
        name="note"
        rows={2}
      />
      <CheckboxField
        defaultChecked={terms?.active ?? true}
        hint={t("activeHint")}
        label={t("active")}
        name="active"
      />
      <SubmitButton className="justify-self-start" size="sm" variant="outline">
        {t(terms ? "save" : "start")}
      </SubmitButton>
    </ActionForm>
  );
};
