"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/action-button";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { TextField } from "@/components/fields";
import { deleteFixedAsset, saveFixedAsset } from "../actions";

/** A fixed asset; amounts in IQD, depreciated straight-line over its life. */
export const AssetForm = ({
  asset,
  disabled = false,
}: {
  readonly asset?: Tables<"fixed_assets">;
  readonly disabled?: boolean;
}) => {
  const t = useTranslations("admin.finance.assets");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <ActionForm
        action={saveFixedAsset}
        className="flex flex-1 flex-wrap items-end gap-3"
        resetOnSuccess={!asset}
      >
        {asset ? <input name="id" type="hidden" value={asset.id} /> : null}
        <TextField
          defaultValue={asset?.name}
          disabled={disabled}
          label={t("name")}
          maxLength={200}
          name="name"
          required
          wrapperClassName="min-w-48 flex-1"
        />
        <TextField
          defaultValue={asset?.category ?? ""}
          disabled={disabled}
          label={t("category")}
          maxLength={60}
          name="category"
          wrapperClassName="w-36"
        />
        <TextField
          defaultValue={asset?.purchase_date ?? ""}
          disabled={disabled}
          label={t("purchaseDate")}
          name="purchaseDate"
          required
          type="date"
          wrapperClassName="w-40"
        />
        <TextField
          defaultValue={asset?.cost ?? ""}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={t("cost")}
          name="cost"
          required
          wrapperClassName="w-36"
        />
        <TextField
          defaultValue={asset?.salvage_value ?? 0}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={t("salvage")}
          name="salvageValue"
          wrapperClassName="w-32"
        />
        <TextField
          defaultValue={asset?.useful_life_months ?? 36}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={t("life")}
          name="usefulLifeMonths"
          required
          wrapperClassName="w-28"
        />
        <TextField
          defaultValue={asset?.disposed_on ?? ""}
          disabled={disabled}
          label={t("disposedOn")}
          name="disposedOn"
          type="date"
          wrapperClassName="w-40"
        />
        <TextField
          defaultValue={asset?.notes ?? ""}
          disabled={disabled}
          label={tCommon("notes")}
          maxLength={2000}
          name="notes"
          wrapperClassName="min-w-48 flex-1"
        />
        {disabled ? null : (
          <SubmitButton variant={asset ? "secondary" : "default"}>
            {asset ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {asset && !disabled ? (
        <ActionButton
          action={deleteFixedAsset}
          confirm={{
            description: t("deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: asset.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
