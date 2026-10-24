"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, FormError, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  FieldGrid,
  SelectField,
  TextField,
} from "@/components/admin/fields";
import { crmStatuses, type SegmentCriteria } from "@/lib/admin/segments";
import { countRecipients, deleteSegment, saveSegment } from "../actions";

interface SegmentFormProps {
  readonly disabled?: boolean;
  readonly segment?: { criteria: SegmentCriteria; id: string; name: string };
}

/** A segment's name and criteria; every criterion set must match. */
export const SegmentForm = ({
  disabled = false,
  segment,
}: SegmentFormProps) => {
  const t = useTranslations("admin.marketing.segments");
  const tCrm = useTranslations("admin.customers.statuses");
  const tCommon = useTranslations("admin.common");
  const criteria = segment?.criteria ?? {};
  let plusMember = "any";
  if (criteria.plus_member !== undefined) {
    plusMember = criteria.plus_member ? "yes" : "no";
  }

  return (
    <div className="grid gap-3 rounded-lg border p-4">
      <ActionForm action={saveSegment}>
        {segment ? <input name="id" type="hidden" value={segment.id} /> : null}
        <fieldset className="grid gap-4" disabled={disabled}>
          <TextField
            defaultValue={segment?.name}
            label={t("name")}
            maxLength={120}
            name="name"
            required
          />
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium text-sm">
              {t("crmStatus")}
            </legend>
            <div className="flex flex-wrap gap-4">
              {crmStatuses.map((status) => (
                <CheckboxField
                  defaultChecked={criteria.crm_status?.includes(status)}
                  key={status}
                  label={tCrm(status)}
                  name="crmStatus[]"
                  value={status}
                />
              ))}
            </div>
            <p className="text-muted-foreground text-xs">{t("crmHint")}</p>
          </fieldset>
          <FieldGrid columns={3}>
            <TextField
              defaultValue={(criteria.tags ?? []).join(", ")}
              hint={t("tagsHint")}
              label={t("tags")}
              name="tags"
            />
            <SelectField
              defaultValue={plusMember}
              label={t("plusMember")}
              name="plusMember"
              options={[
                { label: tCommon("any"), value: "any" },
                { label: t("plusYes"), value: "yes" },
                { label: t("plusNo"), value: "no" },
              ]}
            />
            <SelectField
              defaultValue={criteria.locale ?? "any"}
              label={t("locale")}
              name="locale"
              options={[
                { label: tCommon("any"), value: "any" },
                { label: tCommon("arabic"), value: "ar" },
                { label: tCommon("english"), value: "en" },
              ]}
            />
          </FieldGrid>
          {disabled ? null : (
            <div className="flex justify-end">
              <SubmitButton variant={segment ? "secondary" : "default"}>
                {segment ? tCommon("save") : t("create")}
              </SubmitButton>
            </div>
          )}
        </fieldset>
      </ActionForm>
      {segment ? (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <RecipientCount id={segment.id} />
          {disabled ? null : (
            <ActionButton
              action={deleteSegment}
              confirm={{
                description: t("deleteDescription"),
                title: tCommon("deleteConfirm"),
              }}
              fields={{ id: segment.id }}
              variant="ghost"
            >
              {tCommon("delete")}
            </ActionButton>
          )}
        </div>
      ) : null}
    </div>
  );
};

/** Asks apps/api how many opted-in customers the segment reaches now. */
const RecipientCount = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.marketing.segments");
  const [count, setCount] = useState<number | null>(null);

  return (
    <ActionForm
      action={countRecipients}
      className="flex items-center gap-3"
      onSuccess={(state) => setCount(Number(state.data?.count ?? 0))}
      silent
    >
      <input name="id" type="hidden" value={id} />
      {count === null ? null : (
        <span className="text-sm">
          {t("recipients", { count: String(count) })}
        </span>
      )}
      <SubmitButton size="sm" variant="outline">
        {t("count")}
      </SubmitButton>
      <FormError />
    </ActionForm>
  );
};
