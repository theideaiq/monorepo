"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { SelectField, TextField } from "@/components/admin/fields";
import {
  decideReturn,
  markReturnReceived,
  markReturnRefunded,
} from "../actions";

const FAULTS = ["shop", "customer", "the_idea"] as const;

/** Approve or reject a disputed return, with a note and who is at fault. */
export const DecideReturnForm = ({
  fault,
  id,
}: {
  readonly fault: (typeof FAULTS)[number];
  readonly id: string;
}) => {
  const t = useTranslations("admin.orders.returns");
  const faults = FAULTS.map((value) => ({
    label: t(`faults.${value}`),
    value,
  }));
  return (
    <div className="grid gap-2">
      {[true, false].map((approve) => (
        <ActionForm
          action={decideReturn}
          className="flex flex-wrap items-end gap-2"
          key={String(approve)}
        >
          <input name="id" type="hidden" value={id} />
          <input name="approve" type="hidden" value={String(approve)} />
          <SelectField
            defaultValue={fault}
            label={t("fault")}
            name="fault"
            options={faults}
            wrapperClassName="w-40"
          />
          <TextField
            label={t("note")}
            name="note"
            required
            wrapperClassName="min-w-48 flex-1"
          />
          <SubmitButton size="sm" variant={approve ? "default" : "outline"}>
            {t(approve ? "approve" : "reject")}
          </SubmitButton>
        </ActionForm>
      ))}
    </div>
  );
};

/** A refund sent in Wayl or by ZainCash, Qi or bank transfer. */
export const RefundedForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.orders.returns");
  return (
    <ActionForm
      action={markReturnRefunded}
      className="flex flex-wrap items-end gap-2"
    >
      <input name="id" type="hidden" value={id} />
      <TextField
        label={t("reference")}
        name="reference"
        required
        wrapperClassName="min-w-48 flex-1"
      />
      <SubmitButton size="sm">{t("markRefunded")}</SubmitButton>
    </ActionForm>
  );
};

/** A return The IDEA collected by hand is back at the shop. */
export const ReceivedForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.orders.returns");
  return (
    <ActionForm action={markReturnReceived}>
      <input name="id" type="hidden" value={id} />
      <SubmitButton size="sm">{t("markReceived")}</SubmitButton>
    </ActionForm>
  );
};
