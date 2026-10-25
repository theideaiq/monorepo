"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { TextareaField, TextField } from "@/components/admin/fields";
import { addQuoteLine, createQuote } from "../actions";

/** A new draft quote for a request: notes and how long it stays valid. */
export const NewQuoteForm = ({ requestId }: { readonly requestId: string }) => {
  const t = useTranslations("admin.suite.quotes");
  return (
    <ActionForm action={createQuote} className="grid gap-3">
      <input name="requestId" type="hidden" value={requestId} />
      <TextareaField
        label={t("notes")}
        maxLength={2000}
        name="notes"
        rows={2}
      />
      <TextField
        label={t("validUntil")}
        name="validUntil"
        type="date"
        wrapperClassName="w-48"
      />
      <SubmitButton className="w-fit" variant="secondary">
        {t("create")}
      </SubmitButton>
    </ActionForm>
  );
};

/** One more line on a draft quote. */
export const QuoteLineForm = ({ quoteId }: { readonly quoteId: string }) => {
  const t = useTranslations("admin.suite.quotes");
  return (
    <ActionForm
      action={addQuoteLine}
      className="flex flex-wrap items-end gap-3 border-t pt-3"
    >
      <input name="quoteId" type="hidden" value={quoteId} />
      <TextField
        label={t("description")}
        maxLength={300}
        name="description"
        required
        wrapperClassName="min-w-48 flex-1"
      />
      <TextField
        defaultValue="1"
        inputMode="numeric"
        label={t("quantity")}
        name="quantity"
        required
        wrapperClassName="w-24"
      />
      <TextField
        inputMode="numeric"
        label={t("unitPrice")}
        name="unitPrice"
        required
        wrapperClassName="w-36"
      />
      <SubmitButton variant="secondary">{t("addLine")}</SubmitButton>
    </ActionForm>
  );
};
