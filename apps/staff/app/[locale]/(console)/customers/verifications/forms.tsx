"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextField } from "@/components/admin/fields";
import {
  reviewEducatorCheck,
  reviewIdentityCheck,
  reviewOrganizationCheck,
} from "../actions";

/** Reject with a reason (shown to the member or organization). */
const RejectForm = ({
  action,
  id,
}: {
  readonly action:
    | typeof reviewEducatorCheck
    | typeof reviewIdentityCheck
    | typeof reviewOrganizationCheck;
  readonly id: string;
}) => {
  const t = useTranslations("admin.customers.verifications");
  return (
    <ActionForm action={action} className="flex flex-wrap items-end gap-3">
      <input name="id" type="hidden" value={id} />
      <input name="approve" type="hidden" value="false" />
      <TextField
        label={t("reason")}
        name="reason"
        required
        wrapperClassName="min-w-56 flex-1"
      />
      <SubmitButton size="sm" variant="outline">
        {t("reject")}
      </SubmitButton>
    </ActionForm>
  );
};

/** Approve with the name as it is on the card, or reject. */
export const ReviewIdentityForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.customers.verifications");
  return (
    <div className="grid gap-3">
      <ActionForm
        action={reviewIdentityCheck}
        className="flex flex-wrap items-end gap-3"
      >
        <input name="id" type="hidden" value={id} />
        <input name="approve" type="hidden" value="true" />
        <TextField
          label={t("legalName")}
          maxLength={120}
          name="legalName"
          required
          wrapperClassName="min-w-56 flex-1"
        />
        <SubmitButton size="sm">{t("approve")}</SubmitButton>
      </ActionForm>
      <RejectForm action={reviewIdentityCheck} id={id} />
    </div>
  );
};

/** Approve until a date (by default the end of the year), or reject. */
export const ReviewEducatorForm = ({
  id,
  yearEnd,
}: {
  readonly id: string;
  /** The end of the academic year (YYYY-MM-DD). */
  readonly yearEnd: string;
}) => {
  const t = useTranslations("admin.customers.verifications");
  return (
    <div className="grid gap-3">
      <ActionForm
        action={reviewEducatorCheck}
        className="flex flex-wrap items-end gap-3"
      >
        <input name="id" type="hidden" value={id} />
        <input name="approve" type="hidden" value="true" />
        <TextField
          defaultValue={yearEnd}
          label={t("until")}
          max={yearEnd}
          name="until"
          type="date"
          wrapperClassName="w-44"
        />
        <SubmitButton size="sm">{t("approve")}</SubmitButton>
      </ActionForm>
      <RejectForm action={reviewEducatorCheck} id={id} />
    </div>
  );
};

export const ReviewOrganizationForm = ({ id }: { readonly id: string }) => {
  const t = useTranslations("admin.customers.verifications");
  return (
    <div className="grid gap-3">
      <ActionForm action={reviewOrganizationCheck} className="flex gap-3">
        <input name="id" type="hidden" value={id} />
        <input name="approve" type="hidden" value="true" />
        <SubmitButton size="sm">{t("verify")}</SubmitButton>
      </ActionForm>
      <RejectForm action={reviewOrganizationCheck} id={id} />
    </div>
  );
};
