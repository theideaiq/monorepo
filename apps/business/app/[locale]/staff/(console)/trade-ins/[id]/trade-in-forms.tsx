"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import {
  CheckboxField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { Panel } from "@/components/admin/page";
import type { staffMoves } from "@/lib/admin/trade-ins";
import {
  completeTradeIn,
  makeOffer,
  markReviewing,
  rejectTradeIn,
} from "../actions";

interface TradeInFormsProps {
  readonly moves: ReturnType<typeof staffMoves>;
  readonly offerAmount: number | null;
  readonly offerNote: string | null;
  readonly tradeInId: string;
}

/** The next steps staff can take on a request. */
export const TradeInForms = ({
  moves,
  offerAmount,
  offerNote,
  tradeInId,
}: TradeInFormsProps) => {
  const t = useTranslations("admin.tradeIns");
  const anything =
    moves.canComplete || moves.canOffer || moves.canReject || moves.canReview;

  if (!anything) {
    return (
      <Panel title={t("manage")}>
        <p className="text-muted-foreground text-sm">{t("settled")}</p>
      </Panel>
    );
  }

  return (
    <Panel title={t("manage")}>
      {moves.canReview ? (
        <ActionForm action={markReviewing}>
          <input name="tradeInId" type="hidden" value={tradeInId} />
          <p className="text-muted-foreground text-sm">{t("reviewHint")}</p>
          <SubmitButton className="w-fit" variant="secondary">
            {t("markReviewing")}
          </SubmitButton>
        </ActionForm>
      ) : null}

      {moves.canOffer ? (
        <ActionForm action={makeOffer} className="border-t pt-4">
          <input name="tradeInId" type="hidden" value={tradeInId} />
          <TextField
            defaultValue={offerAmount === null ? "" : String(offerAmount)}
            dir="ltr"
            hint={t("amountHint")}
            inputMode="numeric"
            label={t("amount")}
            name="amount"
            required
          />
          <TextareaField
            defaultValue={offerNote ?? ""}
            hint={t("offerNoteHint")}
            label={t("noteToCustomer")}
            maxLength={2000}
            name="note"
            rows={3}
          />
          <SubmitButton className="w-fit">
            {offerAmount === null ? t("makeOffer") : t("reviseOffer")}
          </SubmitButton>
        </ActionForm>
      ) : null}

      {moves.canComplete ? (
        <ActionForm action={completeTradeIn} className="border-t pt-4">
          <input name="tradeInId" type="hidden" value={tradeInId} />
          <p className="text-muted-foreground text-sm">{t("completeHint")}</p>
          <CheckboxField
            defaultChecked
            hint={t("createProductHint")}
            label={t("createProduct")}
            name="createProduct"
          />
          <SubmitButton className="w-fit">{t("complete")}</SubmitButton>
        </ActionForm>
      ) : null}

      {moves.canReject ? (
        <ActionForm action={rejectTradeIn} className="border-t pt-4">
          <input name="tradeInId" type="hidden" value={tradeInId} />
          <TextareaField
            hint={t("rejectHint")}
            label={t("rejectReason")}
            maxLength={2000}
            name="note"
            rows={2}
          />
          <SubmitButton className="w-fit" variant="destructive">
            {t("reject")}
          </SubmitButton>
        </ActionForm>
      ) : null}
    </Panel>
  );
};
