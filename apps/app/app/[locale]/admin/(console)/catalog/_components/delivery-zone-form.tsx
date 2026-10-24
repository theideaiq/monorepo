"use client";

import type { Tables } from "@repo/database";
import { useTranslations } from "next-intl";
import { ActionButton } from "@/components/admin/action-button";
import { ActionForm, SubmitButton } from "@/components/admin/action-form";
import { CheckboxField, TextField } from "@/components/admin/fields";
import { deleteDeliveryZone, saveDeliveryZone } from "../actions";

interface DeliveryZoneFormProps {
  readonly disabled?: boolean;
  readonly zone?: Tables<"delivery_zones">;
}

/** One delivery zone: names, fee, delivery time and whether it's offered. */
export const DeliveryZoneForm = ({
  disabled = false,
  zone,
}: DeliveryZoneFormProps) => {
  const t = useTranslations("admin.catalog");
  const tZones = useTranslations("admin.catalog.settings.zones");
  const tCommon = useTranslations("admin.common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3">
      <ActionForm
        action={saveDeliveryZone}
        className="flex flex-1 flex-wrap items-end gap-3"
      >
        {zone ? <input name="id" type="hidden" value={zone.id} /> : null}
        <TextField
          defaultValue={zone?.name_ar}
          dir="rtl"
          disabled={disabled}
          label={t("fields.nameAr")}
          name="nameAr"
          wrapperClassName="min-w-32 flex-1"
        />
        <TextField
          defaultValue={zone?.name_en}
          dir="ltr"
          disabled={disabled}
          label={t("fields.nameEn")}
          name="nameEn"
          wrapperClassName="min-w-32 flex-1"
        />
        <TextField
          defaultValue={zone?.governorate ?? ""}
          dir="ltr"
          disabled={disabled}
          label={tZones("governorate")}
          name="governorate"
          wrapperClassName="w-32"
        />
        <TextField
          defaultValue={zone?.fee ?? 5000}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={tZones("fee")}
          name="fee"
          wrapperClassName="w-28"
        />
        <TextField
          defaultValue={zone?.min_days ?? 1}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={tZones("minDays")}
          name="minDays"
          wrapperClassName="w-20"
        />
        <TextField
          defaultValue={zone?.max_days ?? 3}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={tZones("maxDays")}
          name="maxDays"
          wrapperClassName="w-20"
        />
        <TextField
          defaultValue={zone?.position ?? 0}
          dir="ltr"
          disabled={disabled}
          inputMode="numeric"
          label={tCommon("position")}
          name="position"
          wrapperClassName="w-20"
        />
        <CheckboxField
          className="pb-2"
          defaultChecked={zone?.active ?? true}
          disabled={disabled}
          label={tZones("active")}
          name="active"
        />
        {disabled ? null : (
          <SubmitButton variant={zone ? "secondary" : "default"}>
            {zone ? tCommon("save") : tCommon("add")}
          </SubmitButton>
        )}
      </ActionForm>
      {zone && !disabled ? (
        <ActionButton
          action={deleteDeliveryZone}
          confirm={{
            description: tZones("deleteDescription"),
            title: tCommon("deleteConfirm"),
          }}
          fields={{ id: zone.id }}
          size="default"
          variant="ghost"
        >
          {tCommon("delete")}
        </ActionButton>
      ) : null}
    </div>
  );
};
