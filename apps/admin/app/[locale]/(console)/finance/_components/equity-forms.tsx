"use client";

import type { Tables } from "@repo/database";
import { Constants } from "@repo/database";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { SelectField, TextField } from "@/components/fields";
import { instruments, isConvertible } from "@/lib/equity";
import { deleteHolder, deleteRound, saveHolder, saveRound } from "../actions";

/** A funding round; amounts are in the round's own currency. */
export const RoundForm = ({
  disabled = false,
  round,
}: {
  readonly disabled?: boolean;
  readonly round?: Tables<"equity_rounds">;
}) => {
  const t = useTranslations("admin.finance.equity");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <ActionForm
        action={saveRound}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {round ? <input name="id" type="hidden" value={round.id} /> : null}
        <TextField
          defaultValue={round?.name}
          disabled={disabled}
          label={t("round")}
          maxLength={120}
          name="name"
          wrapperClassName="min-w-40 flex-1"
        />
        <TextField
          defaultValue={round?.closed_on ?? ""}
          disabled={disabled}
          label={t("closedOn")}
          name="closedOn"
          type="date"
          wrapperClassName="w-40"
        />
        <TextField
          defaultValue={round?.currency ?? "USD"}
          dir="ltr"
          disabled={disabled}
          label={t("currency")}
          maxLength={3}
          name="currency"
          wrapperClassName="w-20"
        />
        <TextField
          defaultValue={round?.valuation_cap ?? ""}
          dir="ltr"
          disabled={disabled}
          inputMode="decimal"
          label={t("valuationCap")}
          name="valuationCap"
          wrapperClassName="w-36"
        />
        <TextField
          defaultValue={round?.price_per_share ?? ""}
          dir="ltr"
          disabled={disabled}
          inputMode="decimal"
          label={t("pricePerShare")}
          name="pricePerShare"
          wrapperClassName="w-32"
        />
        {disabled ? null : (
          <SubmitButton variant={round ? "secondary" : "default"}>
            {round ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {round && !disabled ? (
        <ActionButton
          action={deleteRound}
          confirm={{
            description: t("deleteRoundDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: round.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};

/**
 * A shareholder (founder, investor, employee or advisor) and what they hold;
 * SAFEs and convertible notes also record the investment, cap and discount.
 */
export const HolderForm = ({
  disabled = false,
  holder,
  rounds,
}: {
  readonly disabled?: boolean;
  readonly holder?: Tables<"equity_holders">;
  readonly rounds: { id: string; name: string }[];
}) => {
  const t = useTranslations("admin.finance.equity");
  const tCommon = useTranslations("admin.common");
  const [instrument, setInstrument] = useState<string>(
    holder?.instrument ?? "common"
  );
  const convertible = isConvertible(instrument);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <ActionForm
        action={saveHolder}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {holder ? <input name="id" type="hidden" value={holder.id} /> : null}
        <TextField
          defaultValue={holder?.name}
          disabled={disabled}
          label={t("holder")}
          maxLength={200}
          name="name"
          wrapperClassName="min-w-40 flex-1"
        />
        <SelectField
          defaultValue={holder?.type ?? "founder"}
          disabled={disabled}
          label={t("type")}
          name="type"
          options={Constants.public.Enums.equity_holder_type.map((value) => ({
            label: t(`types.${value}`),
            value,
          }))}
          wrapperClassName="w-32"
        />
        <SelectField
          disabled={disabled}
          label={t("instrument")}
          name="instrument"
          onChange={(event) => setInstrument(event.target.value)}
          options={instruments.map((value) => ({
            label: t(`instruments.${value}`),
            value,
          }))}
          value={instrument}
          wrapperClassName="w-40"
        />
        <SelectField
          defaultValue={holder?.round_id ?? ""}
          disabled={disabled}
          label={t("round")}
          name="roundId"
          options={[
            { label: tCommon("none"), value: "" },
            ...rounds.map((round) => ({ label: round.name, value: round.id })),
          ]}
          wrapperClassName="w-40"
        />
        <TextField
          defaultValue={holder?.shares ?? ""}
          dir="ltr"
          disabled={disabled}
          hint={convertible ? t("sharesConvertibleHint") : undefined}
          inputMode="numeric"
          label={t("shares")}
          name="shares"
          wrapperClassName="w-36"
        />
        {convertible ? (
          <>
            <TextField
              defaultValue={holder?.invested_amount ?? ""}
              dir="ltr"
              disabled={disabled}
              inputMode="decimal"
              label={t("invested")}
              name="investedAmount"
              required
              wrapperClassName="w-36"
            />
            <TextField
              defaultValue={holder?.conversion_cap ?? ""}
              dir="ltr"
              disabled={disabled}
              inputMode="decimal"
              label={t("conversionCap")}
              name="conversionCap"
              wrapperClassName="w-36"
            />
            <TextField
              defaultValue={holder?.discount_rate ?? ""}
              dir="ltr"
              disabled={disabled}
              inputMode="decimal"
              label={t("discount")}
              name="discountRate"
              wrapperClassName="w-28"
            />
          </>
        ) : null}
        <TextField
          defaultValue={holder?.vesting_start ?? ""}
          disabled={disabled}
          label={t("vestingStart")}
          name="vestingStart"
          type="date"
          wrapperClassName="w-40"
        />
        {disabled ? null : (
          <SubmitButton variant={holder ? "secondary" : "default"}>
            {holder ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {holder && !disabled ? (
        <ActionButton
          action={deleteHolder}
          confirm={{ title: tCommon("deleteConfirm") }}
          fields={{ id: holder.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
