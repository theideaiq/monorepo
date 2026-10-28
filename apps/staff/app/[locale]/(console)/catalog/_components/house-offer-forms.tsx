"use client";

import { useTranslations } from "next-intl";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextField } from "@/components/admin/fields";
import { answerHouseOffer, saveHouseOfferSettings } from "../actions";

/** One of The IDEA's listings: whether it takes offers, and from what. */
export const HouseOfferSettingsForm = ({
  acceptAt,
  accepting,
  condition,
  declineBelow,
  disabled,
  label,
  variantId,
}: {
  readonly acceptAt: number | null;
  readonly accepting: boolean;
  readonly condition: string;
  readonly declineBelow: number | null;
  readonly disabled: boolean;
  readonly label: string;
  readonly variantId: string;
}) => {
  const t = useTranslations("admin.catalog.offers");
  return (
    <ActionForm
      action={saveHouseOfferSettings}
      className="flex flex-wrap items-end gap-3 border-b py-3 last:border-0"
    >
      <input name="variantId" type="hidden" value={variantId} />
      <input name="condition" type="hidden" value={condition} />
      <p className="min-w-40 flex-1 font-medium text-sm">{label}</p>
      <CheckboxField
        defaultChecked={accepting}
        disabled={disabled}
        label={t("takeOffers")}
        name="accept"
      />
      <TextField
        defaultValue={acceptAt ?? ""}
        disabled={disabled}
        inputMode="numeric"
        label={t("autoAccept")}
        name="acceptAt"
        wrapperClassName="w-40"
      />
      <TextField
        defaultValue={declineBelow ?? ""}
        disabled={disabled}
        inputMode="numeric"
        label={t("autoDecline")}
        name="declineBelow"
        wrapperClassName="w-40"
      />
      {disabled ? null : (
        <SubmitButton size="sm" variant="outline">
          {t("save")}
        </SubmitButton>
      )}
    </ActionForm>
  );
};

/** Accept or decline an offer, or counter it once. */
export const AnswerHouseOfferForm = ({
  amount,
  canCounter,
  id,
}: {
  readonly amount: string;
  readonly canCounter: boolean;
  readonly id: string;
}) => {
  const t = useTranslations("admin.catalog.offers");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <ActionForm action={answerHouseOffer}>
        <input name="id" type="hidden" value={id} />
        <input name="answer" type="hidden" value="accept" />
        <SubmitButton size="sm">{t("accept", { amount })}</SubmitButton>
      </ActionForm>
      <ActionForm action={answerHouseOffer}>
        <input name="id" type="hidden" value={id} />
        <input name="answer" type="hidden" value="decline" />
        <SubmitButton size="sm" variant="outline">
          {t("decline")}
        </SubmitButton>
      </ActionForm>
      {canCounter ? (
        <ActionForm
          action={answerHouseOffer}
          className="flex flex-wrap items-end gap-2"
        >
          <input name="id" type="hidden" value={id} />
          <input name="answer" type="hidden" value="counter" />
          <TextField
            inputMode="numeric"
            label={t("counterLabel")}
            name="counter"
            required
            wrapperClassName="w-40"
          />
          <SubmitButton size="sm" variant="outline">
            {t("counter")}
          </SubmitButton>
        </ActionForm>
      ) : null}
    </div>
  );
};
